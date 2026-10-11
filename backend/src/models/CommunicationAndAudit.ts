import mongoose, { Document, Schema } from 'mongoose';

export interface IAnnouncement extends Document {
  title: string;
  content: string;
  targetRole: 'ALL' | 'STUDENT' | 'FACULTY';
  departmentId?: mongoose.Types.ObjectId;
  priority: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
  publishedBy: mongoose.Types.ObjectId;
  publishedAt: Date;
  expiresAt?: Date;
  attachmentUrl?: string;
}

const AnnouncementSchema = new Schema<IAnnouncement>(
  {
    title: { type: String, required: true, trim: true },
    content: { type: String, required: true },
    targetRole: { type: String, enum: ['ALL', 'STUDENT', 'FACULTY', 'STAFF'], default: 'ALL', index: true },
    departmentId: { type: Schema.Types.ObjectId, ref: 'Department' },
    priority: { type: String, enum: ['LOW', 'NORMAL', 'HIGH', 'URGENT'], default: 'NORMAL' },
    publishedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    publishedAt: { type: Date, default: Date.now, index: true },
    expiresAt: { type: Date },
    attachmentUrl: { type: String },
  },
  { timestamps: true }
);

export const Announcement = mongoose.model<IAnnouncement>('Announcement', AnnouncementSchema);

export interface INotification extends Document {
  userId: mongoose.Types.ObjectId;
  title: string;
  message: string;
  type: 'ATTENDANCE' | 'MARKS' | 'ASSIGNMENT' | 'FEE' | 'BONAFIDE' | 'IDCARD' | 'ANNOUNCEMENT' | 'SYSTEM';
  relatedEntityId?: string;
  isRead: boolean;
  createdAt: Date;
}

const NotificationSchema = new Schema<INotification>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    title: { type: String, required: true },
    message: { type: String, required: true },
    type: {
      type: String,
      enum: ['ATTENDANCE', 'MARKS', 'ASSIGNMENT', 'FEE', 'BONAFIDE', 'IDCARD', 'ANNOUNCEMENT', 'SYSTEM'],
      required: true,
      index: true,
    },
    relatedEntityId: { type: String },
    isRead: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export const Notification = mongoose.model<INotification>('Notification', NotificationSchema);

export interface IStudyMaterial extends Document {
  title: string;
  description?: string;
  departmentId: mongoose.Types.ObjectId;
  courseId?: mongoose.Types.ObjectId;
  batchId?: mongoose.Types.ObjectId;
  classId?: mongoose.Types.ObjectId;
  subjectId: mongoose.Types.ObjectId;
  semester: number;
  unitOrTopic?: string;
  unitNumber?: number;
  fileStorageKey?: string;
  fileType?: string;
  fileUrl: string;
  fileName: string;
  fileSize: number; // in bytes
  publicationDate: Date;
  isPublished: boolean;
  downloadsCount: number;
  uploadedBy: mongoose.Types.ObjectId;
  isDeleted?: boolean;
  deletedAt?: Date;
  deletedBy?: mongoose.Types.ObjectId;
  deletionReason?: string;
}

const StudyMaterialSchema = new Schema<IStudyMaterial>(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String },
    departmentId: { type: Schema.Types.ObjectId, ref: 'Department', required: true, index: true },
    courseId: { type: Schema.Types.ObjectId, ref: 'Course', index: true },
    batchId: { type: Schema.Types.ObjectId, ref: 'AcademicBatch', index: true },
    classId: { type: Schema.Types.ObjectId, ref: 'CollegeClass', index: true },
    subjectId: { type: Schema.Types.ObjectId, ref: 'Subject', required: true, index: true },
    semester: { type: Number, required: true },
    unitOrTopic: { type: String },
    unitNumber: { type: Number },
    fileStorageKey: { type: String },
    fileType: { type: String, default: 'pdf' },
    fileUrl: { type: String, required: true },
    fileName: { type: String, required: true },
    fileSize: { type: Number, required: true },
    publicationDate: { type: Date, default: Date.now },
    isPublished: { type: Boolean, default: true, index: true },
    downloadsCount: { type: Number, default: 0 },
    uploadedBy: { type: Schema.Types.ObjectId, ref: 'Faculty', required: true },
    isDeleted: { type: Boolean, default: false, index: true },
    deletedAt: { type: Date },
    deletedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    deletionReason: { type: String, trim: true },
  },
  { timestamps: true }
);

export const StudyMaterial = mongoose.model<IStudyMaterial>('StudyMaterial', StudyMaterialSchema);

export interface IAIUsageRecord extends Document {
  userId: mongoose.Types.ObjectId;
  feature: 'NOTES' | 'QUIZ' | 'ASSISTANT' | 'STUDY_PLAN' | 'CAREER';
  promptLength: number;
  responseLength: number;
  status: 'SUCCESS' | 'ERROR' | 'FALLBACK';
  timestamp: Date;
}

const AIUsageRecordSchema = new Schema<IAIUsageRecord>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    feature: { type: String, enum: ['NOTES', 'QUIZ', 'ASSISTANT', 'STUDY_PLAN', 'CAREER'], required: true },
    promptLength: { type: Number, default: 0 },
    responseLength: { type: Number, default: 0 },
    status: { type: String, enum: ['SUCCESS', 'ERROR', 'FALLBACK'], required: true },
    timestamp: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

export const AIUsageRecord = mongoose.model<IAIUsageRecord>('AIUsageRecord', AIUsageRecordSchema);

export interface IAuditLog extends Document {
  action: string;
  performedBy: mongoose.Types.ObjectId;
  targetEntity: string;
  entityId?: string;
  details?: any;
  ipAddress?: string;
  timestamp: Date;
}

const AuditLogSchema = new Schema<IAuditLog>(
  {
    action: { type: String, required: true, index: true },
    performedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    targetEntity: { type: String, required: true, index: true },
    entityId: { type: String },
    details: { type: Schema.Types.Mixed },
    ipAddress: { type: String },
    timestamp: { type: Date, default: Date.now, index: true },
  },
  { timestamps: true }
);

AuditLogSchema.pre('updateOne', function () {
  if (this.getOptions().bypassAuditProtection) return;
  throw new Error('Audit logs are immutable and cannot be updated.');
});
AuditLogSchema.pre('updateMany', function () {
  if (this.getOptions().bypassAuditProtection) return;
  throw new Error('Audit logs are immutable and cannot be updated.');
});
AuditLogSchema.pre('deleteOne', function () {
  if (this.getOptions().bypassAuditProtection) return;
  throw new Error('Audit logs are protected and cannot be deleted.');
});
AuditLogSchema.pre('deleteMany', function () {
  if (this.getOptions().bypassAuditProtection) return;
  throw new Error('Audit logs are protected and cannot be deleted.');
});

export const AuditLog = mongoose.model<IAuditLog>('AuditLog', AuditLogSchema);

export interface ICollegeTemplate extends Document {
  templateType: 'BONAFIDE' | 'TRANSFER' | 'CONDUCT' | 'ID_CARD' | 'GENERAL';
  title: string;
  version: number;
  effectiveDate: Date;
  contentTemplate: string;
  headerText?: string;
  footerText?: string;
  signatoryTitle: string;
  signatoryName: string;
  signatorySignatureUrl?: string;
  sealUrl?: string;
  imageUrl?: string;
  requiredFields: string[];
  isActive: boolean;
  uploadedBy: string;
  createdAt: Date;
  updatedAt: Date;
}

const CollegeTemplateSchema = new Schema<ICollegeTemplate>(
  {
    templateType: {
      type: String,
      enum: ['BONAFIDE', 'TRANSFER', 'CONDUCT', 'ID_CARD', 'GENERAL'],
      required: true,
      index: true,
    },
    title: { type: String, required: true, trim: true },
    version: { type: Number, default: 1 },
    effectiveDate: { type: Date, default: Date.now },
    contentTemplate: {
      type: String,
      default:
        'This is to certify that {STUDENT_NAME} (Reg. No: {REGISTER_NO}) is a bonafide student of Government Arts and Science College, Kuthalam, studying in {COURSE_NAME}, {YEAR} Year during the academic year {ACADEMIC_YEAR}. This certificate is issued for the purpose of {PURPOSE}.',
    },
    headerText: {
      type: String,
      default: 'GOVERNMENT ARTS AND SCIENCE COLLEGE, KUTHALAM\nMayiladuthurai District, Tamil Nadu - 609801',
    },
    footerText: {
      type: String,
      default: 'Affiliated to Annamalai University | Document verifiable via official portal QR verification token.',
    },
    signatoryTitle: { type: String, default: 'Principal' },
    signatoryName: { type: String, default: 'Dr. Principal, M.Sc., Ph.D.' },
    signatorySignatureUrl: { type: String },
    sealUrl: { type: String },
    imageUrl: { type: String },
    requiredFields: {
      type: [String],
      default: ['STUDENT_NAME', 'REGISTER_NO', 'COURSE_NAME', 'YEAR', 'ACADEMIC_YEAR', 'PURPOSE'],
    },
    isActive: { type: Boolean, default: true, index: true },
    uploadedBy: { type: String, default: 'Principal Office' },
  },
  { timestamps: true }
);

export const CollegeTemplate = mongoose.model<ICollegeTemplate>('CollegeTemplate', CollegeTemplateSchema);

export interface IStudentComplaint extends Document {
  ticketNumber: string;
  studentId: mongoose.Types.ObjectId;
  category: 'ACADEMIC' | 'INFRASTRUCTURE' | 'HOSTEL_CANTEEN' | 'HARASSMENT_RAGGING' | 'EXAMINATION' | 'LIBRARY' | 'GENERAL';
  subject: string;
  description: string;
  evidenceUrl?: string;
  status: 'SUBMITTED' | 'UNDER_REVIEW' | 'ASSIGNED' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  assignedTo?: mongoose.Types.ObjectId;
  officialResponse?: string;
  internalNotes?: string; // Restricted to administrators/signatories
  history: {
    status: string;
    changedBy: mongoose.Types.ObjectId;
    comment?: string;
    timestamp: Date;
  }[];
  resolvedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const StudentComplaintSchema = new Schema<IStudentComplaint>(
  {
    ticketNumber: { type: String, required: true, unique: true, index: true },
    studentId: { type: Schema.Types.ObjectId, ref: 'Student', required: true, index: true },
    category: {
      type: String,
      enum: ['ACADEMIC', 'INFRASTRUCTURE', 'HOSTEL_CANTEEN', 'HARASSMENT_RAGGING', 'EXAMINATION', 'LIBRARY', 'GENERAL'],
      required: true,
      index: true,
    },
    subject: { type: String, required: true, trim: true },
    description: { type: String, required: true },
    evidenceUrl: { type: String },
    status: {
      type: String,
      enum: ['SUBMITTED', 'UNDER_REVIEW', 'ASSIGNED', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'],
      default: 'SUBMITTED',
      index: true,
    },
    priority: {
      type: String,
      enum: ['LOW', 'MEDIUM', 'HIGH', 'URGENT'],
      default: 'MEDIUM',
    },
    assignedTo: { type: Schema.Types.ObjectId, ref: 'Faculty' },
    officialResponse: { type: String, trim: true },
    internalNotes: { type: String, trim: true },
    history: [
      {
        status: { type: String, required: true },
        changedBy: { type: Schema.Types.ObjectId, ref: 'User' },
        comment: { type: String },
        timestamp: { type: Date, default: Date.now },
      },
    ],
    resolvedAt: { type: Date },
  },
  { timestamps: true }
);

export const StudentComplaint = mongoose.model<IStudentComplaint>('StudentComplaint', StudentComplaintSchema);


