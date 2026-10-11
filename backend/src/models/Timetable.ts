import mongoose, { Document, Schema } from 'mongoose';

export type DayOfWeek = 'MONDAY' | 'TUESDAY' | 'WEDNESDAY' | 'THURSDAY' | 'FRIDAY' | 'SATURDAY';

export interface ITimetableSlot extends Document {
  academicYear: string;
  semester: number;
  departmentId: mongoose.Types.ObjectId;
  section: string;
  dayOfWeek: DayOfWeek;
  periodNo: number; // 1 to 6
  startTime: string; // e.g. "09:30"
  endTime: string; // e.g. "10:30"
  subjectId: mongoose.Types.ObjectId;
  facultyId: mongoose.Types.ObjectId;
  roomNo: string;
}

const TimetableSlotSchema = new Schema<ITimetableSlot>(
  {
    academicYear: { type: String, required: true },
    semester: { type: Number, required: true },
    departmentId: { type: Schema.Types.ObjectId, ref: 'Department', required: true, index: true },
    section: { type: String, required: true, uppercase: true },
    dayOfWeek: {
      type: String,
      enum: ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'],
      required: true,
    },
    periodNo: { type: Number, required: true, min: 1, max: 8 },
    startTime: { type: String, required: true },
    endTime: { type: String, required: true },
    subjectId: { type: Schema.Types.ObjectId, ref: 'Subject', required: true },
    facultyId: { type: Schema.Types.ObjectId, ref: 'Faculty', required: true },
    roomNo: { type: String, required: true, trim: true },
  },
  { timestamps: true }
);

TimetableSlotSchema.index(
  { academicYear: 1, departmentId: 1, semester: 1, section: 1, dayOfWeek: 1, periodNo: 1 },
  { unique: true }
);

export const TimetableSlot = mongoose.model<ITimetableSlot>('TimetableSlot', TimetableSlotSchema);

export interface ICalendarEvent extends Document {
  title: string;
  description?: string;
  startDate: Date;
  endDate: Date;
  type: 'HOLIDAY' | 'EXAM' | 'SEMINAR' | 'CULTURAL' | 'MEETING' | 'DEADLINE' | 'EVENT' | 'ANNOUNCEMENT';
  targetAudience: 'ALL' | 'STUDENT' | 'FACULTY';
  departmentId?: mongoose.Types.ObjectId;
  targetCourseId?: mongoose.Types.ObjectId;
  targetClassId?: mongoose.Types.ObjectId;
  venue?: string;
  organizer?: string;
  registrationDeadline?: Date;
  attachmentUrl?: string;
  isPublished: boolean;
  publishedBy?: mongoose.Types.ObjectId;
  isDeleted?: boolean;
  deletedAt?: Date;
  deletedBy?: mongoose.Types.ObjectId;
  deletionReason?: string;
}

const CalendarEventSchema = new Schema<ICalendarEvent>(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    startDate: { type: Date, required: true, index: true },
    endDate: { type: Date, required: true },
    type: {
      type: String,
      enum: ['HOLIDAY', 'EXAM', 'SEMINAR', 'CULTURAL', 'MEETING', 'DEADLINE', 'EVENT', 'ANNOUNCEMENT'],
      required: true,
      index: true,
    },
    targetAudience: { type: String, enum: ['ALL', 'STUDENT', 'FACULTY'], default: 'ALL', index: true },
    departmentId: { type: Schema.Types.ObjectId, ref: 'Department' },
    targetCourseId: { type: Schema.Types.ObjectId, ref: 'Course' },
    targetClassId: { type: Schema.Types.ObjectId, ref: 'CollegeClass' },
    venue: { type: String, trim: true },
    organizer: { type: String, trim: true, default: 'GASC Administration' },
    registrationDeadline: { type: Date },
    attachmentUrl: { type: String },
    isPublished: { type: Boolean, default: true, index: true },
    publishedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    isDeleted: { type: Boolean, default: false, index: true },
    deletedAt: { type: Date },
    deletedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    deletionReason: { type: String, trim: true },
  },
  { timestamps: true }
);

export const CalendarEvent = mongoose.model<ICalendarEvent>('CalendarEvent', CalendarEventSchema);

