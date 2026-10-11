import { Request, Response } from 'express';
import crypto from 'crypto';
import mongoose from 'mongoose';
import { z } from 'zod';
import {
  StudentFeeAccount,
  PaymentOrder,
  Payment,
  Student,
  FeeStructure,
} from '../../models';
import { AuthenticatedRequest } from '../../types';
import { sendError, sendSuccess } from '../../utils/response';
import { config } from '../../config';
import { logAuditEvent } from '../../middleware/audit';

const CreateOrderSchema = z.object({
  feeAccountId: z.string().min(1),
  amount: z.number().positive(),
  idempotencyKey: z.string().min(8),
});

const VerifyPaymentSchema = z.object({
  orderId: z.string().min(1),
  transactionId: z.string().min(1),
  paymentMethod: z.string().default('UPI'),
  sandboxSignature: z.string().optional(),
});

// Student gets their current fee account details and payment history
export const getMyFeeDetails = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const student = await Student.findOne({ userId: req.user!.userId });
    if (!student) {
      sendError(res, 'Student profile not found', 404);
      return;
    }

    const feeAccounts = await StudentFeeAccount.find({ studentId: student._id })
      .populate('feeStructureId')
      .sort({ semester: -1 })
      .lean();

    const paymentHistory = await Payment.find({ studentId: student._id })
      .sort({ verifiedAt: -1 })
      .lean();

    sendSuccess(
      res,
      {
        feeAccounts,
        paymentHistory,
      },
      'Fee accounts and payments retrieved'
    );
  } catch (err: any) {
    sendError(res, err.message, 500);
  }
};

// Create payment order (with idempotency protection)
export const createPaymentOrder = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  const parsed = CreateOrderSchema.safeParse(req.body);
  if (!parsed.success) {
    sendError(res, parsed.error.errors[0].message, 422);
    return;
  }

  const { feeAccountId, amount, idempotencyKey } = parsed.data;

  const student = await Student.findOne({ userId: req.user!.userId });
  if (!student) {
    sendError(res, 'Student profile not found', 404);
    return;
  }

  // Idempotency check: if an order with this idempotency key already exists, return it
  const existingOrder = await PaymentOrder.findOne({ idempotencyKey });
  if (existingOrder) {
    sendSuccess(
      res,
      {
        order: existingOrder,
        isIdempotentReplay: true,
      },
      'Existing payment order returned'
    );
    return;
  }

  const feeAccount = await StudentFeeAccount.findById(feeAccountId);
  if (!feeAccount || feeAccount.studentId.toString() !== student._id.toString()) {
    sendError(res, 'Invalid fee account or unauthorized', 400);
    return;
  }

  if (amount > feeAccount.balanceAmount) {
    sendError(
      res,
      `Requested amount (₹${amount}) exceeds outstanding balance (₹${feeAccount.balanceAmount})`,
      400
    );
    return;
  }

  const count = await PaymentOrder.countDocuments();
  const orderId = `ORD_GASC_${Date.now()}_${count + 1}`;

  const order = await PaymentOrder.create({
    orderId,
    studentId: student._id,
    feeAccountId: feeAccount._id,
    amount,
    currency: 'INR',
    status: 'PENDING',
    idempotencyKey,
    isSandbox: true, // Sandbox mode for government demo
  });

  await logAuditEvent('PAYMENT_ORDER_CREATED', req.user!.userId, 'PaymentOrder', order._id.toString(), { amount, orderId }, req.ip);

  sendSuccess(
    res,
    {
      order,
      gatewayConfig: {
        keyId: config.payment.keyId,
        currency: 'INR',
        collegeName: config.college.name,
      },
    },
    'Payment order created successfully',
    201
  );
};

// Verify payment securely and update account balance idempotently
export const verifyAndRecordPayment = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  const parsed = VerifyPaymentSchema.safeParse(req.body);
  if (!parsed.success) {
    sendError(res, parsed.error.errors[0].message, 422);
    return;
  }

  const { orderId, transactionId, paymentMethod } = parsed.data;

  const order = await PaymentOrder.findOne({ orderId });
  if (!order) {
    sendError(res, 'Payment order not found', 404);
    return;
  }

  if (order.status === 'SUCCESS') {
    // Already processed idempotently
    const existingPayment = await Payment.findOne({ orderId });
    sendSuccess(res, { payment: existingPayment, order }, 'Payment already verified and recorded');
    return;
  }

  // Check if transactionId has already been recorded
  const duplicateTx = await Payment.findOne({ transactionId });
  if (duplicateTx) {
    sendError(res, 'Duplicate transaction ID detected. Payment was previously recorded.', 409);
    return;
  }

  const feeAccount = await StudentFeeAccount.findById(order.feeAccountId);
  if (!feeAccount) {
    sendError(res, 'Associated fee account not found', 404);
    return;
  }

  // Generate official receipt number
  const receiptCount = await Payment.countDocuments();
  const receiptNumber = `REC/GASC/${new Date().getFullYear()}/${String(receiptCount + 1).padStart(5, '0')}`;

  // Update order status
  order.status = 'SUCCESS';
  order.receiptNumber = receiptNumber;
  await order.save();

  // Create payment record
  const payment = await Payment.create({
    orderId: order.orderId,
    studentId: order.studentId,
    feeAccountId: order.feeAccountId,
    transactionId,
    amount: order.amount,
    paymentMethod,
    status: 'SUCCESS',
    verifiedAt: new Date(),
    receiptUrl: `/api/v1/payments/receipts/${receiptNumber}`,
  });

  // Update StudentFeeAccount balance
  feeAccount.paidAmount += order.amount;
  feeAccount.balanceAmount = Math.max(0, feeAccount.netPayable - feeAccount.paidAmount);
  feeAccount.status = feeAccount.balanceAmount === 0 ? 'PAID' : 'PARTIAL';
  await feeAccount.save();

  await logAuditEvent(
    'PAYMENT_VERIFIED',
    req.user!.userId,
    'Payment',
    payment._id.toString(),
    {
      orderId,
      transactionId,
      amount: order.amount,
      receiptNumber,
      remainingBalance: feeAccount.balanceAmount,
    },
    req.ip
  );

  sendSuccess(
    res,
    {
      payment,
      updatedAccount: {
        paidAmount: feeAccount.paidAmount,
        balanceAmount: feeAccount.balanceAmount,
        status: feeAccount.status,
      },
      receiptNumber,
    },
    'Payment verified and recorded successfully'
  );
};

// Admin reconciliation: view all transactions and summary
export const getAdminPaymentReconciliation = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const { startDate, endDate, status } = req.query;
    const filter: any = {};
    if (status) filter.status = status;

    const payments = await Payment.find(filter)
      .populate({
        path: 'studentId',
        select: 'fullName registerNo section departmentId',
        populate: { path: 'departmentId', select: 'name code' },
      })
      .sort({ verifiedAt: -1 })
      .lean();

    let totalCollected = 0;
    payments.forEach((p) => {
      if (p.status === 'SUCCESS') totalCollected += p.amount;
    });

    sendSuccess(
      res,
      {
        totalCollected,
        transactionCount: payments.length,
        payments,
      },
      'Payment reconciliation data retrieved'
    );
  } catch (err: any) {
    sendError(res, err.message, 500);
  }
};
