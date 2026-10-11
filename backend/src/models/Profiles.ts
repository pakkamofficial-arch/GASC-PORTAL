import mongoose, { Document, Schema } from 'mongoose';

export interface IPreviousEducation {
  schoolName?: string;
  board?: string;
  tenthMarks?: string;
  twelfthMarks?: string;
  tcNumber?: string;
}

export interface IStudent extends Document {
  userId: mongoose.Types.ObjectId;
  registerNo: string;
  rollNumber?: string;
  fullName: string;
  departmentId: mongoose.Types.ObjectId;
  courseId: mongoose.Types.ObjectId;
  batchId?: mongoose.Types.ObjectId;
  classId?: mongoose.Types.ObjectId;
  year: number; // 1, 2, 3
  currentSemester: number;
  section: string;
  academicYear: string; // e.g. "2024-2025"
  dob: Date;
  gender: 'MALE' | 'FEMALE' | 'OTHER';
  email: string;
  phone: string;
  guardianName: string;
  guardianRelationship?: string;
  guardianPhone: string;
  address: string;
  emergencyContact?: string;
  photoUrl?: string;
  bloodGroup?: string;
  community?: string;
  previousEducation?: IPreviousEducation;
  admissionDate: Date;
  status: 'ACTIVE' | 'PROMOTED' | 'GRADUATED' | 'DEACTIVATED' | 'TRANSFERRED' | 'ARCHIVED';
  idCardStatus: 'NOT_ISSUED' | 'PENDING' | 'ISSUED' | 'REVOKED' | 'NEEDS_REISSUE';
  isDeleted?: boolean;
  deletedAt?: Date;
  deletedBy?: mongoose.Types.ObjectId;
  deletionReason?: string;
}

const StudentSchema = new Schema<IStudent>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true, index: true },
    registerNo: { type: String, required: true, unique: true, uppercase: true, trim: true, index: true },
    rollNumber: { type: String, trim: true, uppercase: true, index: true },
    fullName: { type: String, required: true, trim: true },
    departmentId: { type: Schema.Types.ObjectId, ref: 'Department', required: true, index: true },
    courseId: { type: Schema.Types.ObjectId, ref: 'Course', required: true, index: true },
    batchId: { type: Schema.Types.ObjectId, ref: 'AcademicBatch', index: true },
    classId: { type: Schema.Types.ObjectId, ref: 'CollegeClass', index: true },
    year: { type: Number, default: 1, min: 1, max: 3 },
    currentSemester: { type: Number, required: true, min: 1, max: 8 },
    section: { type: String, required: true, default: 'A', uppercase: true },
    academicYear: { type: String, required: true },
    dob: { type: Date, required: true },
    gender: { type: String, enum: ['MALE', 'FEMALE', 'OTHER'], required: true },
    email: { type: String, required: true, lowercase: true, trim: true },
    phone: { type: String, required: true, trim: true },
    guardianName: { type: String, required: true, trim: true },
    guardianRelationship: { type: String, trim: true, default: 'Parent' },
    guardianPhone: { type: String, required: true, trim: true },
    address: { type: String, required: true },
    emergencyContact: { type: String, trim: true },
    photoUrl: { type: String },
    bloodGroup: { type: String },
    community: { type: String },
    previousEducation: {
      schoolName: { type: String },
      board: { type: String },
      tenthMarks: { type: String },
      twelfthMarks: { type: String },
      tcNumber: { type: String },
    },
    admissionDate: { type: Date, default: Date.now },
    status: {
      type: String,
      enum: ['ACTIVE', 'PROMOTED', 'GRADUATED', 'DEACTIVATED', 'TRANSFERRED', 'ARCHIVED'],
      default: 'ACTIVE',
      index: true,
    },
    idCardStatus: {
      type: String,
      enum: ['NOT_ISSUED', 'PENDING', 'ISSUED', 'REVOKED', 'NEEDS_REISSUE'],
      default: 'PENDING',
      index: true,
    },
    isDeleted: { type: Boolean, default: false, index: true },
    deletedAt: { type: Date },
    deletedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    deletionReason: { type: String, trim: true },
  },
  { timestamps: true }
);

// Fallback rollNumber to registerNo before save
StudentSchema.pre('save', function (next) {
  if (!this.rollNumber && this.registerNo) {
    this.rollNumber = this.registerNo;
  }
  next();
});

export const Student = mongoose.model<IStudent>('Student', StudentSchema);

export interface IFacultyAssignedClass {
  departmentId: mongoose.Types.ObjectId;
  semester: number;
  section: string;
  subjectId: mongoose.Types.ObjectId;
  courseId?: mongoose.Types.ObjectId;
  classId?: mongoose.Types.ObjectId;
}

export interface IFaculty extends Document {
  userId: mongoose.Types.ObjectId;
  employeeId: string;
  fullName: string;
  departmentId: mongoose.Types.ObjectId;
  designation: string;
  qualification: string;
  email: string;
  phone: string;
  specialization?: string;
  address?: string;
  assignedClasses: IFacultyAssignedClass[];
  joiningDate: Date;
  dob?: Date;
  isHod: boolean;
  isDeleted?: boolean;
  deletedAt?: Date;
  deletedBy?: mongoose.Types.ObjectId;
  deletionReason?: string;
}

const FacultySchema = new Schema<IFaculty>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true, index: true },
    employeeId: { type: String, required: true, unique: true, uppercase: true, trim: true, index: true },
    fullName: { type: String, required: true, trim: true },
    departmentId: { type: Schema.Types.ObjectId, ref: 'Department', required: true, index: true },
    designation: { type: String, required: true, default: 'Assistant Professor' },
    qualification: { type: String, required: true },
    email: { type: String, required: true, lowercase: true, trim: true },
    phone: { type: String, required: true, trim: true },
    dob: { type: Date },
    specialization: { type: String },
    address: { type: String, trim: true },
    assignedClasses: [
      {
        departmentId: { type: Schema.Types.ObjectId, ref: 'Department', required: true },
        semester: { type: Number, required: true },
        section: { type: String, required: true },
        subjectId: { type: Schema.Types.ObjectId, ref: 'Subject', required: true },
        courseId: { type: Schema.Types.ObjectId, ref: 'Course' },
        classId: { type: Schema.Types.ObjectId, ref: 'CollegeClass' },
      },
    ],
    joiningDate: { type: Date, default: Date.now },
    isHod: { type: Boolean, default: false },
    isDeleted: { type: Boolean, default: false, index: true },
    deletedAt: { type: Date },
    deletedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    deletionReason: { type: String, trim: true },
  },
  { timestamps: true }
);

export const Faculty = mongoose.model<IFaculty>('Faculty', FacultySchema);

export interface IFacultyLeave extends Document {
  facultyId: mongoose.Types.ObjectId;
  leaveType: 'CASUAL' | 'MEDICAL' | 'EARNED' | 'SPECIAL';
  startDate: Date;
  endDate: Date;
  reason: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  reviewedBy?: mongoose.Types.ObjectId;
  rejectionReason?: string;
  createdAt: Date;
  updatedAt: Date;
}

const FacultyLeaveSchema = new Schema<IFacultyLeave>(
  {
    facultyId: { type: Schema.Types.ObjectId, ref: 'Faculty', required: true, index: true },
    leaveType: {
      type: String,
      enum: ['CASUAL', 'MEDICAL', 'EARNED', 'SPECIAL'],
      default: 'CASUAL',
    },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    reason: { type: String, required: true, trim: true },
    status: {
      type: String,
      enum: ['PENDING', 'APPROVED', 'REJECTED'],
      default: 'PENDING',
      index: true,
    },
    reviewedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    rejectionReason: { type: String, trim: true },
  },
  { timestamps: true }
);

export const FacultyLeave = mongoose.model<IFacultyLeave>('FacultyLeave', FacultyLeaveSchema);

