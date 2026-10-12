export type UserRole = 'STUDENT' | 'STAFF' | 'FACULTY' | 'ADMIN';

export type AccountStatus = 'ACTIVE' | 'PENDING' | 'SUSPENDED' | 'INACTIVE';

export interface User {
  id: string;
  identifier: string;
  role: UserRole;
  email?: string;
  phone?: string;
  status: AccountStatus;
  isHod?: boolean;
  departmentId?: string;
  mustChangePassword?: boolean;
  isPrimaryAdmin?: boolean;
  adminImmutableId?: string;
  e2eePublicKey?: string;
}

export type ConversationType =
  | 'CLASS_GROUP'
  | 'FACULTY_ONLY'
  | 'WHOLE_COLLEGE'
  | 'PRINCIPAL_RESTRICTED'
  | 'ADMIN_RESTRICTED'
  | 'DIRECT';

export interface ChatConversation {
  id: string;
  _id: string;
  name: string;
  type: ConversationType;
  description?: string;
  keyVersion: number;
  lastMessage?: {
    messageId: string;
    senderId: string;
    timestamp: string;
  };
  updatedAt: string;
  memberCount: number;
  isAnnouncementOnly?: boolean;
}

export interface ChatAttachment {
  attachmentId: string;
  storageKey: string;
  fileSize: number;
  fileNonce: string;
  originalFileNameCiphertext?: string;
  mimeTypeCiphertext?: string;
}

export interface ChatMessageItem {
  _id: string;
  conversationId: string;
  senderId: string;
  senderRole: string;
  senderIdentifier: string;
  senderName: string;
  ciphertext: string;
  nonce: string;
  keyVersion: number;
  replyTo?: string;
  attachments?: ChatAttachment[];
  isEdited?: boolean;
  isDeleted?: boolean;
  readBy?: { userId: string; readAt: string }[];
  createdAt: string;
  decryptedText?: string;
}


export interface StudentProfile {
  _id: string;
  registerNo: string;
  fullName: string;
  currentSemester: number;
  section: string;
  academicYear: string;
  email: string;
  phone: string;
  address: string;
  guardianName: string;
  guardianPhone: string;
  bloodGroup?: string;
  departmentId: {
    _id: string;
    name: string;
    code: string;
  };
  courseId: {
    _id: string;
    name: string;
    code: string;
    degree: string;
  };
}

export interface FacultyProfile {
  _id: string;
  employeeId: string;
  fullName: string;
  designation: string;
  qualification: string;
  email: string;
  phone: string;
  address?: string;
  specialization?: string;
  isHod: boolean;
  departmentId: {
    _id: string;
    name: string;
    code: string;
  };
  assignedClasses: Array<{
    departmentId: { _id: string; name: string; code: string };
    semester: number;
    section: string;
    subjectId: { _id: string; title: string; code: string };
  }>;
}

export interface AttendanceSubjectStat {
  subjectId: string;
  subjectCode: string;
  subjectTitle: string;
  attended: number;
  total: number;
  percentage: number;
  isLowAttendance: boolean;
}

export interface StudentDashboardData {
  student: StudentProfile;
  attendance: {
    overallPercentage: number;
    totalClassesHeld: number;
    attendedClasses: number;
    subjectWise: AttendanceSubjectStat[];
    lowAttendanceWarning: boolean;
  };
  todayTimetable: Array<{
    _id: string;
    periodNo: number;
    startTime: string;
    endTime: string;
    roomNo: string;
    subjectId: { title: string; code: string };
    facultyId: { fullName: string; designation: string };
  }>;
  recentMarks: Array<{
    assessmentId: string;
    assessmentTitle: string;
    category: string;
    subjectTitle: string;
    subjectCode: string;
    maxMarks: number;
    marksObtained: number | string;
    isAbsent: boolean;
    grade: string;
  }>;
  upcomingAssignments: Array<{
    _id: string;
    title: string;
    dueDate: string;
    maxMarks: number;
    subjectId: { title: string; code: string };
  }>;
  announcements: Array<{
    _id: string;
    title: string;
    content: string;
    priority: string;
    publishedAt: string;
  }>;
  fee: {
    total: number;
    concession: number;
    netPayable: number;
    paid: number;
    balance: number;
    status: string;
  } | null;
  idCardStatus: string;
  latestBonafideStatus: string | null;
}
