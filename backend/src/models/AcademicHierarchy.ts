import mongoose, { Document, Schema } from 'mongoose';

export interface IDepartment extends Document {
  code: string;
  name: string;
  headOfDepartment?: string;
  hodFacultyId?: mongoose.Types.ObjectId;
  description?: string;
  status: 'ACTIVE' | 'INACTIVE';
}

const DepartmentSchema = new Schema<IDepartment>(
  {
    code: { type: String, required: true, unique: true, uppercase: true, trim: true },
    name: { type: String, required: true, trim: true },
    headOfDepartment: { type: String, trim: true },
    hodFacultyId: { type: Schema.Types.ObjectId, ref: 'Faculty' },
    description: { type: String, trim: true },
    status: { type: String, enum: ['ACTIVE', 'INACTIVE'], default: 'ACTIVE', index: true },
  },
  { timestamps: true }
);

export const Department = mongoose.model<IDepartment>('Department', DepartmentSchema);

export interface ICourse extends Document {
  code: string;
  name: string;
  departmentId: mongoose.Types.ObjectId;
  degree: 'UG' | 'PG' | 'M.PHIL' | 'PHD';
  durationYears: number;
  totalSemesters: number;
  status: 'ACTIVE' | 'INACTIVE';
}

const CourseSchema = new Schema<ICourse>(
  {
    code: { type: String, required: true, unique: true, uppercase: true, trim: true },
    name: { type: String, required: true, trim: true },
    departmentId: { type: Schema.Types.ObjectId, ref: 'Department', required: true, index: true },
    degree: { type: String, enum: ['UG', 'PG', 'M.PHIL', 'PHD'], default: 'UG' },
    durationYears: { type: Number, required: true, default: 3 },
    totalSemesters: { type: Number, required: true, default: 6 },
    status: { type: String, enum: ['ACTIVE', 'INACTIVE'], default: 'ACTIVE', index: true },
  },
  { timestamps: true }
);

export const Course = mongoose.model<ICourse>('Course', CourseSchema);

export interface IAcademicBatch extends Document {
  name: string; // e.g. "2024-2027"
  courseId: mongoose.Types.ObjectId;
  admissionYear: number;
  graduationYear: number;
  status: 'ACTIVE' | 'GRADUATED' | 'INACTIVE';
}

const AcademicBatchSchema = new Schema<IAcademicBatch>(
  {
    name: { type: String, required: true, trim: true },
    courseId: { type: Schema.Types.ObjectId, ref: 'Course', required: true, index: true },
    admissionYear: { type: Number, required: true },
    graduationYear: { type: Number, required: true },
    status: { type: String, enum: ['ACTIVE', 'GRADUATED', 'INACTIVE'], default: 'ACTIVE', index: true },
  },
  { timestamps: true }
);

AcademicBatchSchema.index({ courseId: 1, admissionYear: 1 }, { unique: true });

export const AcademicBatch = mongoose.model<IAcademicBatch>('AcademicBatch', AcademicBatchSchema);

export interface ISubject extends Document {
  code: string;
  title: string;
  departmentId: mongoose.Types.ObjectId;
  semester: number;
  credits: number;
  maxInternalMarks: number;
  maxExternalMarks: number;
  syllabusOverview?: string;
  status: 'ACTIVE' | 'INACTIVE';
}

const SubjectSchema = new Schema<ISubject>(
  {
    code: { type: String, required: true, unique: true, uppercase: true, trim: true },
    title: { type: String, required: true, trim: true },
    departmentId: { type: Schema.Types.ObjectId, ref: 'Department', required: true, index: true },
    semester: { type: Number, required: true, min: 1, max: 8 },
    credits: { type: Number, required: true, default: 4 },
    maxInternalMarks: { type: Number, required: true, default: 25 },
    maxExternalMarks: { type: Number, required: true, default: 75 },
    syllabusOverview: { type: String },
    status: { type: String, enum: ['ACTIVE', 'INACTIVE'], default: 'ACTIVE' },
  },
  { timestamps: true }
);

export const Subject = mongoose.model<ISubject>('Subject', SubjectSchema);

export interface IClassInChargeHistory {
  facultyId: mongoose.Types.ObjectId;
  assignedAt: Date;
  assignedBy?: mongoose.Types.ObjectId;
  revokedAt?: Date;
  reason?: string;
}

export interface ISubjectAssignment {
  subjectId: mongoose.Types.ObjectId;
  facultyId: mongoose.Types.ObjectId;
  assignedAt: Date;
}

export interface ICollegeClass extends Document {
  courseId: mongoose.Types.ObjectId;
  departmentId: mongoose.Types.ObjectId;
  batchId?: mongoose.Types.ObjectId;
  year: number; // 1, 2, 3
  section: string; // 'A', 'B'
  academicYear: string; // "2024-2025"
  currentSemester: number; // 1 to 6
  classInCharge?: mongoose.Types.ObjectId;
  inChargeHistory: IClassInChargeHistory[];
  subjectAssignments: ISubjectAssignment[];
  attendancePolicy: 'PERIOD_WISE' | 'DAILY';
  roomNo?: string;
  active: boolean;
}

const CollegeClassSchema = new Schema<ICollegeClass>(
  {
    courseId: { type: Schema.Types.ObjectId, ref: 'Course', required: true, index: true },
    departmentId: { type: Schema.Types.ObjectId, ref: 'Department', required: true, index: true },
    batchId: { type: Schema.Types.ObjectId, ref: 'AcademicBatch', index: true },
    year: { type: Number, required: true, min: 1, max: 3 },
    section: { type: String, required: true, default: 'A', uppercase: true, trim: true },
    academicYear: { type: String, required: true, trim: true },
    currentSemester: { type: Number, required: true, min: 1, max: 6 },
    classInCharge: { type: Schema.Types.ObjectId, ref: 'Faculty' },
    inChargeHistory: [
      {
        facultyId: { type: Schema.Types.ObjectId, ref: 'Faculty', required: true },
        assignedAt: { type: Date, default: Date.now },
        assignedBy: { type: Schema.Types.ObjectId, ref: 'User' },
        revokedAt: { type: Date },
        reason: { type: String },
      },
    ],
    subjectAssignments: [
      {
        subjectId: { type: Schema.Types.ObjectId, ref: 'Subject', required: true },
        facultyId: { type: Schema.Types.ObjectId, ref: 'Faculty', required: true },
        assignedAt: { type: Date, default: Date.now },
      },
    ],
    attendancePolicy: {
      type: String,
      enum: ['PERIOD_WISE', 'DAILY'],
      default: 'PERIOD_WISE',
    },
    roomNo: { type: String, trim: true },
    active: { type: Boolean, default: true, index: true },
  },
  { timestamps: true }
);

CollegeClassSchema.index(
  { courseId: 1, year: 1, section: 1, academicYear: 1 },
  { unique: true }
);

export const CollegeClass = mongoose.model<ICollegeClass>('CollegeClass', CollegeClassSchema);

export interface IStudentAcademicHistory extends Document {
  studentId: mongoose.Types.ObjectId;
  classId: mongoose.Types.ObjectId;
  year: number;
  section: string;
  academicYear: string;
  effectiveFrom: Date;
  effectiveTo?: Date;
  changeReason: 'ADMISSION' | 'PROMOTION' | 'SECTION_TRANSFER' | 'YEAR_REPEAT' | 'CORRECTION';
  changedBy?: mongoose.Types.ObjectId;
}

const StudentAcademicHistorySchema = new Schema<IStudentAcademicHistory>(
  {
    studentId: { type: Schema.Types.ObjectId, ref: 'Student', required: true, index: true },
    classId: { type: Schema.Types.ObjectId, ref: 'CollegeClass', required: true, index: true },
    year: { type: Number, required: true },
    section: { type: String, required: true },
    academicYear: { type: String, required: true },
    effectiveFrom: { type: Date, default: Date.now },
    effectiveTo: { type: Date },
    changeReason: {
      type: String,
      enum: ['ADMISSION', 'PROMOTION', 'SECTION_TRANSFER', 'YEAR_REPEAT', 'CORRECTION'],
      default: 'ADMISSION',
    },
    changedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

export const StudentAcademicHistory = mongoose.model<IStudentAcademicHistory>(
  'StudentAcademicHistory',
  StudentAcademicHistorySchema
);
