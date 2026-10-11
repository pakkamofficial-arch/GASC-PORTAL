import mongoose, { Document, Schema } from 'mongoose';
import { PaymentStatus } from '../types';

export interface IFeeStructure extends Document {
  academicYear: string;
  semester: number;
  departmentId: mongoose.Types.ObjectId;
  degree: 'UG' | 'PG';
  tuitionFee: number;
  specialFee: number;
  labFee: number;
  libraryFee: number;
  examFee: number;
  otherFee: number;
  totalAmount: number;
  dueDate: Date;
}

const FeeStructureSchema = new Schema<IFeeStructure>(
  {
    academicYear: { type: String, required: true },
    semester: { type: Number, required: true },
    departmentId: { type: Schema.Types.ObjectId, ref: 'Department', required: true, index: true },
    degree: { type: String, enum: ['UG', 'PG'], required: true },
    tuitionFee: { type: Number, required: true, default: 0 },
    specialFee: { type: Number, required: true, default: 0 },
    labFee: { type: Number, required: true, default: 0 },
    libraryFee: { type: Number, required: true, default: 0 },
    examFee: { type: Number, required: true, default: 0 },
    otherFee: { type: Number, required: true, default: 0 },
    totalAmount: { type: Number, required: true },
    dueDate: { type: Date, required: true },
  },
  { timestamps: true }
);

FeeStructureSchema.index({ academicYear: 1, semester: 1, departmentId: 1 }, { unique: true });

export const FeeStructure = mongoose.model<IFeeStructure>('FeeStructure', FeeStructureSchema);

export interface IStudentFeeAccount extends Document {
  studentId: mongoose.Types.ObjectId;
  academicYear: string;
  semester: number;
  feeStructureId: mongoose.Types.ObjectId;
  baseAmount: number;
  concessionAmount: number; // Scholarship / Govt waiver
  concessionReason?: string;
  netPayable: number;
  paidAmount: number;
  balanceAmount: number;
  status: 'PENDING' | 'PARTIAL' | 'PAID' | 'EXEMPTED';
}

const StudentFeeAccountSchema = new Schema<IStudentFeeAccount>(
  {
    studentId: { type: Schema.Types.ObjectId, ref: 'Student', required: true, index: true },
    academicYear: { type: String, required: true },
    semester: { type: Number, required: true },
    feeStructureId: { type: Schema.Types.ObjectId, ref: 'FeeStructure', required: true },
    baseAmount: { type: Number, required: true },
    concessionAmount: { type: Number, default: 0 },
    concessionReason: { type: String },
    netPayable: { type: Number, required: true },
    paidAmount: { type: Number, default: 0 },
    balanceAmount: { type: Number, required: true },
    status: {
      type: String,
      enum: ['PENDING', 'PARTIAL', 'PAID', 'EXEMPTED'],
      default: 'PENDING',
      index: true,
    },
  },
  { timestamps: true }
);

StudentFeeAccountSchema.index({ studentId: 1, academicYear: 1, semester: 1 }, { unique: true });

export const StudentFeeAccount = mongoose.model<IStudentFeeAccount>('StudentFeeAccount', StudentFeeAccountSchema);

export interface IPaymentOrder extends Document {
  orderId: string;
  studentId: mongoose.Types.ObjectId;
  feeAccountId: mongoose.Types.ObjectId;
  amount: number;
  currency: string;
  status: PaymentStatus;
  receiptNumber?: string;
  idempotencyKey: string;
  gatewayOrderId?: string;
  isSandbox: boolean;
}

const PaymentOrderSchema = new Schema<IPaymentOrder>(
  {
    orderId: { type: String, required: true, unique: true, index: true },
    studentId: { type: Schema.Types.ObjectId, ref: 'Student', required: true, index: true },
    feeAccountId: { type: Schema.Types.ObjectId, ref: 'StudentFeeAccount', required: true },
    amount: { type: Number, required: true },
    currency: { type: String, default: 'INR' },
    status: {
      type: String,
      enum: ['PENDING', 'SUCCESS', 'FAILED', 'REFUNDED'],
      default: 'PENDING',
      index: true,
    },
    receiptNumber: { type: String, unique: true, sparse: true },
    idempotencyKey: { type: String, required: true, unique: true },
    gatewayOrderId: { type: String },
    isSandbox: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export const PaymentOrder = mongoose.model<IPaymentOrder>('PaymentOrder', PaymentOrderSchema);

export interface IPayment extends Document {
  orderId: string;
  studentId: mongoose.Types.ObjectId;
  feeAccountId: mongoose.Types.ObjectId;
  transactionId: string;
  amount: number;
  paymentMethod: string;
  status: PaymentStatus;
  verifiedAt: Date;
  receiptUrl?: string;
  gatewayResponse?: any;
}

const PaymentSchema = new Schema<IPayment>(
  {
    orderId: { type: String, required: true, index: true },
    studentId: { type: Schema.Types.ObjectId, ref: 'Student', required: true, index: true },
    feeAccountId: { type: Schema.Types.ObjectId, ref: 'StudentFeeAccount', required: true },
    transactionId: { type: String, required: true, unique: true, index: true },
    amount: { type: Number, required: true },
    paymentMethod: { type: String, default: 'UPI/NetBanking' },
    status: { type: String, enum: ['PENDING', 'SUCCESS', 'FAILED', 'REFUNDED'], default: 'SUCCESS' },
    verifiedAt: { type: Date, default: Date.now },
    receiptUrl: { type: String },
    gatewayResponse: { type: Schema.Types.Mixed },
  },
  { timestamps: true }
);

export const Payment = mongoose.model<IPayment>('Payment', PaymentSchema);
