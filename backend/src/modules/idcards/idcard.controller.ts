import { Request, Response } from 'express';
import crypto from 'crypto';
import mongoose from 'mongoose';
import { StudentIDCard, Student } from '../../models';
import { AuthenticatedRequest } from '../../types';
import { sendError, sendSuccess } from '../../utils/response';
import { config } from '../../config';
import { logAuditEvent } from '../../middleware/audit';

// Student views their own ID card
export const getMyIDCard = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const student = await Student.findOne({ userId: req.user!.userId })
      .populate('departmentId', 'name code')
      .populate('courseId', 'name code');

    if (!student) {
      sendError(res, 'Student profile not found', 404);
      return;
    }

    let idCard = await StudentIDCard.findOne({ studentId: student._id }).lean();

    sendSuccess(
      res,
      {
        card: idCard,
        student,
        college: config.college,
      },
      'Digital ID Card retrieved'
    );
  } catch (err: any) {
    sendError(res, err.message, 500);
  }
};

// Student requests an ID card
export const requestIDCard = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  const student = await Student.findOne({ userId: req.user!.userId });
  if (!student) {
    sendError(res, 'Student profile not found', 404);
    return;
  }

  let card = await StudentIDCard.findOne({ studentId: student._id });
  if (card && card.status === 'ISSUED') {
    sendError(res, 'You already have an active issued ID Card', 400);
    return;
  }

  const token = crypto.randomBytes(24).toString('hex');
  const count = await StudentIDCard.countDocuments();
  const cardNumber = `GASC-ID-${new Date().getFullYear()}-${String(count + 1).padStart(4, '0')}`;

  if (!card) {
    card = await StudentIDCard.create({
      studentId: student._id,
      cardNumber,
      status: 'PENDING',
      qrVerificationToken: token,
      issueDate: new Date(),
      expiryDate: new Date(Date.now() + 3 * 365 * 24 * 60 * 60 * 1000), // 3 years
    });
  } else {
    card.status = 'PENDING';
    card.qrVerificationToken = token;
    await card.save();
  }

  await logAuditEvent('IDCARD_REQUESTED', req.user!.userId, 'StudentIDCard', card._id.toString(), {}, req.ip);
  sendSuccess(res, card, 'Digital ID Card application submitted successfully', 201);
};

// Admin approves & issues ID card
export const issueIDCard = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  const { id } = req.params;
  const card = await StudentIDCard.findById(id);
  if (!card) {
    sendError(res, 'ID Card record not found', 404);
    return;
  }

  card.status = 'ISSUED';
  card.approvedBy = new mongoose.Types.ObjectId(req.user!.userId);
  card.approvedAt = new Date();
  await card.save();

  await logAuditEvent('IDCARD_ISSUED', req.user!.userId, 'StudentIDCard', card._id.toString(), {}, req.ip);
  sendSuccess(res, card, 'ID Card approved and issued');
};

// Admin revokes an ID card
export const revokeIDCard = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  const { id } = req.params;
  const { reason } = req.body;

  const card = await StudentIDCard.findById(id);
  if (!card) {
    sendError(res, 'ID Card not found', 404);
    return;
  }

  card.status = 'REVOKED';
  card.revocationReason = reason || 'Revoked by Administration';
  await card.save();

  await logAuditEvent('IDCARD_REVOKED', req.user!.userId, 'StudentIDCard', card._id.toString(), { reason }, req.ip);
  sendSuccess(res, card, 'ID Card revoked successfully');
};

// Admin lists all ID cards
export const getAllIDCards = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const { status } = req.query;
    const filter: any = {};
    if (status) filter.status = status;

    const cards = await StudentIDCard.find(filter)
      .populate({
        path: 'studentId',
        select: 'fullName registerNo section photoUrl academicYear departmentId courseId',
        populate: [
          { path: 'departmentId', select: 'name code' },
          { path: 'courseId', select: 'name code degree' },
        ],
      })
      .sort({ createdAt: -1 })
      .lean();

    sendSuccess(res, { cards }, 'All ID cards retrieved');
  } catch (err: any) {
    sendError(res, err.message, 500);
  }
};

// Public QR verification endpoint (Opaque token verification without leaking sensitive private data)
export const verifyCardToken = async (req: Request, res: Response): Promise<void> => {
  try {
    const { token } = req.params;
    const card = await StudentIDCard.findOne({ qrVerificationToken: token }).populate({
      path: 'studentId',
      select: 'fullName registerNo academicYear currentSemester section departmentId courseId',
      populate: [
        { path: 'departmentId', select: 'name code' },
        { path: 'courseId', select: 'name code degree' },
      ],
    });

    if (!card) {
      sendError(res, 'Invalid verification code or unverified ID card', 404);
      return;
    }

    const isExpired = new Date() > card.expiryDate;
    const isValid = card.status === 'ISSUED' && !isExpired;

    const student = card.studentId as any;

    sendSuccess(res, {
      verificationStatus: isValid ? 'VALID' : 'INVALID',
      cardStatus: card.status,
      isExpired,
      cardNumber: card.cardNumber,
      issueDate: card.issueDate,
      expiryDate: card.expiryDate,
      institution: {
        name: config.college.name,
        affiliation: config.college.affiliation,
      },
      student: {
        fullName: student.fullName,
        registerNo: student.registerNo,
        department: student.departmentId?.name,
        course: student.courseId?.name,
        academicYear: student.academicYear,
      },
    });
  } catch (err: any) {
    sendError(res, err.message, 500);
  }
};
