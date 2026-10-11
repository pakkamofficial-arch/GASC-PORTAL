import mongoose, { Document, Schema } from 'mongoose';
import { BonafideStatus, IDCardStatus } from '../types';

export interface IBonafideHistory {
  status: BonafideStatus;
  changedBy: mongoose.Types.ObjectId;
  reason?: string;
  timestamp: Date;
}

export interface IBonafideRequest extends Document {
  studentId: mongoose.Types.ObjectId;
  purpose: string;
  additionalDetails?: string;
  status: BonafideStatus;
  certificateNumber?: string;
  templateVersion?: number;
  correctionNotes?: string;
  rejectionReason?: string;
  approvedBy?: mongoose.Types.ObjectId;
  approvedAt?: Date;
  issuedAt?: Date;
  academicYear: string;
  history: IBonafideHistory[];
}

const BonafideRequestSchema = new Schema<IBonafideRequest>(
  {
    studentId: { type: Schema.Types.ObjectId, ref: 'Student', required: true, index: true },
    purpose: {
      type: String,
      required: true,
      enum: ['SCHOLARSHIP', 'BUS_PASS', 'TRAIN_PASS', 'PASSPORT', 'BANK_ACCOUNT', 'EDUCATION_LOAN', 'INTERNSHIP', 'GENERAL'],
    },
    additionalDetails: { type: String, trim: true },
    status: {
      type: String,
      enum: ['DRAFT', 'SUBMITTED', 'UNDER_REVIEW', 'CORRECTION_REQUIRED', 'APPROVED', 'REJECTED', 'ISSUED'],
      default: 'SUBMITTED',
      index: true,
    },
    certificateNumber: { type: String, unique: true, sparse: true },
    templateVersion: { type: Number, default: 1 },
    correctionNotes: { type: String, trim: true },
    rejectionReason: { type: String, trim: true },
    approvedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    approvedAt: { type: Date },
    issuedAt: { type: Date },
    academicYear: { type: String, required: true },
    history: [
      {
        status: { type: String, required: true },
        changedBy: { type: Schema.Types.ObjectId, ref: 'User' },
        reason: { type: String },
        timestamp: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true }
);

export const BonafideRequest = mongoose.model<IBonafideRequest>('BonafideRequest', BonafideRequestSchema);

export interface IStudentIDCard extends Document {
  studentId: mongoose.Types.ObjectId;
  cardNumber: string;
  issueDate: Date;
  expiryDate: Date;
  status: IDCardStatus;
  qrVerificationToken: string;
  reissueCount: number;
  reissueReason?: string;
  approvedBy?: mongoose.Types.ObjectId;
  approvedAt?: Date;
  revocationReason?: string;
  history: {
    action: string;
    performedBy: mongoose.Types.ObjectId;
    reason?: string;
    timestamp: Date;
  }[];
}

const StudentIDCardSchema = new Schema<IStudentIDCard>(
  {
    studentId: { type: Schema.Types.ObjectId, ref: 'Student', required: true, unique: true, index: true },
    cardNumber: { type: String, required: true, unique: true, uppercase: true },
    issueDate: { type: Date, default: Date.now },
    expiryDate: { type: Date, required: true },
    status: {
      type: String,
      enum: ['PENDING', 'ISSUED', 'REVOKED', 'REISSUED'],
      default: 'PENDING',
      index: true,
    },
    qrVerificationToken: { type: String, required: true, unique: true, index: true },
    reissueCount: { type: Number, default: 0 },
    reissueReason: { type: String },
    approvedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    approvedAt: { type: Date },
    revocationReason: { type: String },
    history: [
      {
        action: { type: String, required: true },
        performedBy: { type: Schema.Types.ObjectId, ref: 'User' },
        reason: { type: String },
        timestamp: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true }
);

export const StudentIDCard = mongoose.model<IStudentIDCard>('StudentIDCard', StudentIDCardSchema);

