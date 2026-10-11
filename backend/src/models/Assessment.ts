import mongoose, { Document, Schema } from 'mongoose';
import { AssessmentCategory, MarksStatus } from '../types';

export interface IAssessment extends Document {
  title: string;
  category: AssessmentCategory;
  academicYear: string;
  semester: number;
  departmentId: mongoose.Types.ObjectId;
  subjectId: mongoose.Types.ObjectId;
  maxMarks: number;
  passingMarks: number;
  assessmentDate: Date;
  entryDeadline: Date;
  status: MarksStatus;
  facultyId: mongoose.Types.ObjectId;
  approvedBy?: mongoose.Types.ObjectId;
  approvedAt?: Date;
  publishedAt?: Date;
  remarks?: string;
}

const AssessmentSchema = new Schema<IAssessment>(
  {
    title: { type: String, required: true, trim: true },
    category: {
      type: String,
      enum: ['INTERNAL_TEST', 'ASSIGNMENT', 'SEMINAR', 'PRACTICAL', 'EXTERNAL_EXAM'],
      required: true,
      index: true,
    },
    academicYear: { type: String, required: true },
    semester: { type: Number, required: true },
    departmentId: { type: Schema.Types.ObjectId, ref: 'Department', required: true, index: true },
    subjectId: { type: Schema.Types.ObjectId, ref: 'Subject', required: true, index: true },
    maxMarks: { type: Number, required: true, min: 1 },
    passingMarks: { type: Number, required: true, min: 0 },
    assessmentDate: { type: Date, required: true },
    entryDeadline: { type: Date, required: true },
    status: {
      type: String,
      enum: ['DRAFT', 'SUBMITTED', 'APPROVED', 'PUBLISHED', 'REJECTED'],
      default: 'DRAFT',
      index: true,
    },
    facultyId: { type: Schema.Types.ObjectId, ref: 'Faculty', required: true, index: true },
    approvedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    approvedAt: { type: Date },
    publishedAt: { type: Date },
    remarks: { type: String },
  },
  { timestamps: true }
);

export const Assessment = mongoose.model<IAssessment>('Assessment', AssessmentSchema);

export interface IMark extends Document {
  assessmentId: mongoose.Types.ObjectId;
  studentId: mongoose.Types.ObjectId;
  subjectId: mongoose.Types.ObjectId;
  marksObtained: number;
  isAbsent: boolean;
  grade?: string;
  enteredBy: mongoose.Types.ObjectId;
  lastUpdatedBy?: mongoose.Types.ObjectId;
  remarks?: string;
}

const MarkSchema = new Schema<IMark>(
  {
    assessmentId: { type: Schema.Types.ObjectId, ref: 'Assessment', required: true, index: true },
    studentId: { type: Schema.Types.ObjectId, ref: 'Student', required: true, index: true },
    subjectId: { type: Schema.Types.ObjectId, ref: 'Subject', required: true, index: true },
    marksObtained: {
      type: Number,
      required: true,
      min: [0, 'Marks cannot be negative'],
    },
    isAbsent: { type: Boolean, default: false },
    grade: { type: String },
    enteredBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    lastUpdatedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    remarks: { type: String },
  },
  { timestamps: true }
);

// One mark per student per assessment
MarkSchema.index({ assessmentId: 1, studentId: 1 }, { unique: true });

export const Mark = mongoose.model<IMark>('Mark', MarkSchema);
