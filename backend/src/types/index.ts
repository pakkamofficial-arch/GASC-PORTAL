import { Request } from 'express';

export type UserRole = 'STUDENT' | 'STAFF' | 'FACULTY' | 'ADMIN';

export type AccountStatus = 'ACTIVE' | 'PENDING' | 'SUSPENDED' | 'INACTIVE';

export interface TokenPayload {
  userId: string;
  role: UserRole;
  identifier: string; // registerNo, employeeId, or admin username
  departmentId?: string;
  adminImmutableId?: string;
  e2eePublicKey?: string;
}

export interface AuthenticatedRequest extends Request {
  user?: TokenPayload;
}

export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  errors?: any;
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
    totalPages?: number;
  };
}

export type AttendanceStatus = 'PRESENT' | 'ABSENT' | 'OD' | 'EXCUSED';

export type AssessmentCategory = 'INTERNAL_TEST' | 'ASSIGNMENT' | 'SEMINAR' | 'PRACTICAL' | 'EXTERNAL_EXAM';

export type MarksStatus = 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'PUBLISHED' | 'REJECTED';

export type BonafideStatus =
  | 'DRAFT'
  | 'SUBMITTED'
  | 'UNDER_REVIEW'
  | 'CORRECTION_REQUIRED'
  | 'APPROVED'
  | 'REJECTED'
  | 'ISSUED';

export type IDCardStatus = 'PENDING' | 'ISSUED' | 'REVOKED' | 'REISSUED';

export type PaymentStatus = 'PENDING' | 'SUCCESS' | 'FAILED' | 'REFUNDED';
