import mongoose, { Document, Schema } from 'mongoose';
import { AttendanceStatus } from '../types';

export interface IAttendanceSession extends Document {
  academicYear: string;
  semester: number;
  departmentId: mongoose.Types.ObjectId;
  section: string;
  subjectId: mongoose.Types.ObjectId;
  facultyId: mongoose.Types.ObjectId;
  date: Date;
  period: number; // 1 to 6
  isFinalized: boolean;
  totalStudents: number;
  presentCount: number;
  absentCount: number;
}

const AttendanceSessionSchema = new Schema<IAttendanceSession>(
  {
    academicYear: { type: String, required: true },
    semester: { type: Number, required: true },
    departmentId: { type: Schema.Types.ObjectId, ref: 'Department', required: true, index: true },
    section: { type: String, required: true, uppercase: true },
    subjectId: { type: Schema.Types.ObjectId, ref: 'Subject', required: true, index: true },
    facultyId: { type: Schema.Types.ObjectId, ref: 'Faculty', required: true, index: true },
    date: { type: Date, required: true, index: true },
    period: { type: Number, required: true, min: 1, max: 8 },
    isFinalized: { type: Boolean, default: true },
    totalStudents: { type: Number, default: 0 },
    presentCount: { type: Number, default: 0 },
    absentCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

// Prevent duplicate attendance sessions for the same class, subject, date, and period
AttendanceSessionSchema.index(
  { departmentId: 1, semester: 1, section: 1, subjectId: 1, date: 1, period: 1 },
  { unique: true }
);

export const AttendanceSession = mongoose.model<IAttendanceSession>('AttendanceSession', AttendanceSessionSchema);

export interface IAttendanceRecord extends Document {
  sessionId: mongoose.Types.ObjectId;
  studentId: mongoose.Types.ObjectId;
  status: AttendanceStatus;
  remarks?: string;
  modifiedBy?: mongoose.Types.ObjectId;
  modifiedAt?: Date;
  reasonForChange?: string;
}

const AttendanceRecordSchema = new Schema<IAttendanceRecord>(
  {
    sessionId: { type: Schema.Types.ObjectId, ref: 'AttendanceSession', required: true, index: true },
    studentId: { type: Schema.Types.ObjectId, ref: 'Student', required: true, index: true },
    status: { type: String, enum: ['PRESENT', 'ABSENT', 'OD', 'EXCUSED'], required: true },
    remarks: { type: String, trim: true },
    modifiedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    modifiedAt: { type: Date },
    reasonForChange: { type: String, trim: true },
  },
  { timestamps: true }
);

// Ensure one record per student per session
AttendanceRecordSchema.index({ sessionId: 1, studentId: 1 }, { unique: true });

export const AttendanceRecord = mongoose.model<IAttendanceRecord>('AttendanceRecord', AttendanceRecordSchema);
