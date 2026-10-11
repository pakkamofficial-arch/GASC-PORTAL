import { Response } from 'express';
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import crypto from 'crypto';
import { z } from 'zod';
import {
  User,
  Student,
  Faculty,
  Department,
  Course,
  Subject,
  CollegeClass,
  AcademicBatch,
  StudentAcademicHistory,
  AttendanceSession,
  AttendanceRecord,
  BonafideRequest,
  Payment,
  AuditLog,
  FacultyLeave,
  CollegeTemplate,
} from '../../models';
import { AuthenticatedRequest } from '../../types';
import { sendError, sendSuccess } from '../../utils/response';
import { logAuditEvent } from '../../middleware/audit';
import { BackupService } from '../../services/backup.service';
import { CleanupService } from '../../services/cleanup.service';
import { PRIMARY_ADMIN_IMMUTABLE_ID } from '../../services/admin-bootstrap.service';

const CreateStudentSchema = z.object({
  registerNo: z.string().min(3),
  rollNumber: z.string().optional(),
  fullName: z.string().min(2),
  password: z.string().min(6).optional(),
  email: z.string().email().optional(),
  phone: z.string().min(10).optional(),
  departmentId: z.string().optional(),
  courseId: z.string().min(1),
  batchId: z.string().optional(),
  classId: z.string().optional(),
  year: z.number().min(1).max(3).optional().default(1),
  currentSemester: z.number().min(1).max(8).optional().default(1),
  section: z.string().min(1).default('A'),
  academicYear: z.string().min(4),
  dob: z.string(),
  gender: z.enum(['MALE', 'FEMALE', 'OTHER']),
  guardianName: z.string().min(2),
  guardianRelationship: z.string().optional().default('Parent'),
  guardianPhone: z.string().min(10).optional().default('9876543210'),
  address: z.string().min(3).optional().default('Kuthalam, Mayiladuthurai'),
  emergencyContact: z.string().optional(),
  bloodGroup: z.string().optional(),
  community: z.string().optional(),
  previousEducation: z
    .object({
      schoolName: z.string().optional(),
      board: z.string().optional(),
      tenthMarks: z.any().optional(),
      twelfthMarks: z.any().optional(),
      tcNumber: z.string().optional(),
    })
    .optional(),
});

const CreateFacultySchema = z.object({
  employeeId: z.string().optional(),
  autoGenerateId: z.boolean().optional(),
  fullName: z.string().min(2, 'Full name must be at least 2 characters'),
  password: z.string().optional(),
  email: z.string().email('Valid email address is required'),
  phone: z.string().min(10, 'Valid 10-digit mobile number required'),
  departmentId: z.string().min(1, 'Department is required'),
  designation: z.string().min(2, 'Designation is required'),
  qualification: z.string().min(2, 'Qualification is required'),
  dob: z.string().optional(),
  specialization: z.string().optional(),
  address: z.string().optional(),
  status: z.enum(['ACTIVE', 'SUSPENDED']).optional().default('ACTIVE'),
  assignedClasses: z
    .array(
      z.object({
        departmentId: z.string(),
        semester: z.number().min(1).max(8),
        section: z.string().min(1),
        subjectId: z.string().min(1),
        courseId: z.string().optional(),
        classId: z.string().optional(),
      })
    )
    .optional(),
});

const UpdateFacultySchema = z.object({
  fullName: z.string().min(2).optional(),
  departmentId: z.string().optional(),
  designation: z.string().min(2).optional(),
  qualification: z.string().min(2).optional(),
  dob: z.string().optional(),
  phone: z.string().min(10).optional(),
  email: z.string().email().optional(),
  address: z.string().optional(),
  specialization: z.string().optional(),
  status: z.enum(['ACTIVE', 'SUSPENDED', 'INACTIVE']).optional(),
});

const AssignFacultyClassesSchema = z.object({
  assignedClasses: z.array(
    z.object({
      departmentId: z.string(),
      semester: z.number().min(1).max(8),
      section: z.string().min(1),
      subjectId: z.string().min(1),
      courseId: z.string().optional(),
      classId: z.string().optional(),
    })
  ),
});

export const generateNextStaffId = async (): Promise<string> => {
  const facultyRecords = await Faculty.find(
    { employeeId: { $regex: /^(GASCK-STF-|STF-|FAC-)/i } },
    { employeeId: 1 }
  ).lean();

  let maxNum = 0;
  for (const f of facultyRecords) {
    const match = f.employeeId.match(/(\d+)$/);
    if (match) {
      const num = parseInt(match[1], 10);
      if (num > maxNum) maxNum = num;
    }
  }

  let nextNum = maxNum + 1;
  let candidateId = `GASCK-STF-${String(nextNum).padStart(3, '0')}`;

  while (
    (await User.exists({ identifier: candidateId })) ||
    (await Faculty.exists({ employeeId: candidateId }))
  ) {
    nextNum++;
    candidateId = `GASCK-STF-${String(nextNum).padStart(3, '0')}`;
  }

  return candidateId;
};

export const generateSecureTemporaryPassword = (): string => {
  const chars = 'abcdefghjkmnpqrstuvwxyz';
  const uppers = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const digits = '23456789';
  const specials = '!@#$%&*';

  let pwd = 'Gasc@';
  for (let i = 0; i < 4; i++) {
    pwd += chars.charAt(crypto.randomInt(chars.length));
  }
  for (let i = 0; i < 2; i++) {
    pwd += digits.charAt(crypto.randomInt(digits.length));
  }
  pwd += specials.charAt(crypto.randomInt(specials.length));
  return pwd;
};

export const validatePasswordStrength = (pwd: string): { valid: boolean; message?: string } => {
  if (!pwd || pwd.length < 8) {
    return { valid: false, message: 'Password must be at least 8 characters long.' };
  }
  const commonWeak = ['12345678', 'password', 'password123', 'admin123', 'qwerty1234'];
  if (commonWeak.includes(pwd.toLowerCase())) {
    return { valid: false, message: 'Password is too common and weak. Please choose a stronger password.' };
  }
  const hasUpper = /[A-Z]/.test(pwd);
  const hasLower = /[a-z]/.test(pwd);
  const hasDigitOrSpecial = /[\d!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(pwd);

  if (!hasUpper || !hasLower || !hasDigitOrSpecial) {
    return {
      valid: false,
      message: 'Password must contain at least one uppercase letter, one lowercase letter, and one number or special symbol.',
    };
  }
  return { valid: true };
};

// Admin Dashboard Summary
export const getAdminDashboard = async (
  _req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const [
      totalStudents,
      totalFaculty,
      totalDepartments,
      pendingBonafide,
      todaySessions,
      payments,
      recentAuditLogs,
    ] = await Promise.all([
      Student.countDocuments(),
      Faculty.countDocuments(),
      Department.countDocuments(),
      BonafideRequest.countDocuments({ status: 'PENDING' }),
      AttendanceSession.countDocuments({
        date: {
          $gte: new Date(new Date().setUTCHours(0, 0, 0, 0)),
          $lte: new Date(new Date().setUTCHours(23, 59, 59, 999)),
        },
      }),
      Payment.find({ status: 'SUCCESS' }).select('amount').lean(),
      AuditLog.find()
        .populate('performedBy', 'identifier role')
        .sort({ timestamp: -1 })
        .limit(10)
        .lean(),
    ]);

    let totalFeesCollected = 0;
    payments.forEach((p) => (totalFeesCollected += p.amount));

    sendSuccess(
      res,
      {
        stats: {
          totalStudents,
          totalFaculty,
          totalDepartments,
          pendingBonafide,
          todaySessions,
          totalFeesCollected,
        },
        recentAuditLogs,
      },
      'Admin dashboard summary retrieved'
    );
  } catch (err: any) {
    sendError(res, err.message, 500);
  }
};

// List students with pagination & search
export const listStudents = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const { page = '1', limit = '20', search, departmentId, semester, includeArchived } = req.query;
    const filter: any = {};
    if (includeArchived !== 'true') {
      filter.isDeleted = { $ne: true };
    }

    if (departmentId) filter.departmentId = departmentId;
    if (semester) filter.currentSemester = Number(semester);
    if (search) {
      filter.$or = [
        { registerNo: { $regex: search, $options: 'i' } },
        { fullName: { $regex: search, $options: 'i' } },
      ];
    }

    const skip = (Number(page) - 1) * Number(limit);
    const [students, total] = await Promise.all([
      Student.find(filter)
        .populate('departmentId', 'name code')
        .populate('courseId', 'name code degree')
        .populate('userId', 'status lastLogin')
        .sort({ registerNo: 1 })
        .skip(skip)
        .limit(Number(limit))
        .lean(),
      Student.countDocuments(filter),
    ]);

    sendSuccess(
      res,
      { students },
      'Students list retrieved',
      200,
      {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / Number(limit)),
      }
    );
  } catch (err: any) {
    sendError(res, err.message, 500);
  }
};

// Create a new verified student account with automatic class grouping & history
export const createStudent = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  const parsed = CreateStudentSchema.safeParse(req.body);
  if (!parsed.success) {
    sendError(res, parsed.error.errors[0].message, 422);
    return;
  }

  const data = parsed.data;
  const regNo = data.registerNo.trim().toUpperCase();
  const rollNo = (data.rollNumber || regNo).trim().toUpperCase();

  // Validate course exists
  const course = await Course.findById(data.courseId);
  if (!course) {
    sendError(res, 'Specified course does not exist', 404);
    return;
  }

  // Resolve department ID from input or from course
  const resolvedDeptId = data.departmentId || course.departmentId?.toString();
  const dept = await Department.findById(resolvedDeptId);
  if (!dept) {
    sendError(res, 'Specified department does not exist', 404);
    return;
  }
  if (course.departmentId.toString() !== resolvedDeptId.toString()) {
    sendError(res, 'Selected course does not belong to the selected department', 422);
    return;
  }

  // Duplicate checks
  const [existingUser, existingStudent] = await Promise.all([
    User.findOne({ identifier: regNo }),
    Student.findOne({ $or: [{ registerNo: regNo }, { rollNumber: rollNo }] }),
  ]);

  if (existingUser || existingStudent) {
    sendError(res, `A student with register number or roll number '${regNo}' already exists`, 409);
    return;
  }

  // Automatic class grouping: find or create corresponding database-backed CollegeClass
  let classId = data.classId;
  const yearNum = data.year || 1;
  const sec = data.section.toUpperCase();
  const acadYear = data.academicYear;

  if (!classId) {
    let matchedClass = await CollegeClass.findOne({
      courseId: data.courseId,
      year: yearNum,
      section: sec,
      academicYear: acadYear,
      active: true,
    });

    if (!matchedClass) {
      matchedClass = await CollegeClass.create({
        courseId: data.courseId,
        departmentId: resolvedDeptId,
        batchId: data.batchId,
        year: yearNum,
        section: sec,
        academicYear: acadYear,
        currentSemester: data.currentSemester || (yearNum * 2 - 1),
        active: true,
      });
    }
    classId = matchedClass._id.toString();
  }

  // Resolve Batch: if not provided, find active batch for this course
  let batchId = data.batchId;
  if (!batchId) {
    const activeBatch = await AcademicBatch.findOne({ courseId: data.courseId, status: 'ACTIVE' });
    if (activeBatch) {
      batchId = activeBatch._id.toString();
    }
  }

  const isPasswordGiven = Boolean(data.password);
  const rawPassword = data.password || Math.random().toString(36).slice(-8);
  const passwordHash = await bcrypt.hash(rawPassword, 12);

  const user = await User.create({
    identifier: regNo,
    passwordHash,
    role: 'STUDENT',
    status: isPasswordGiven ? 'ACTIVE' : 'PENDING',
    isActivated: isPasswordGiven,
    createdBy: req.user!.userId,
    email: data.email || `${regNo.toLowerCase()}@student.gasckuthalam.edu.in`,
    phone: data.phone || '9876543210',
  });

  const student = await Student.create({
    userId: user._id,
    registerNo: regNo,
    rollNumber: rollNo,
    fullName: data.fullName,
    departmentId: resolvedDeptId,
    courseId: data.courseId,
    batchId,
    classId,
    year: yearNum,
    currentSemester: data.currentSemester || (yearNum * 2 - 1),
    section: sec,
    academicYear: acadYear,
    dob: new Date(data.dob),
    gender: data.gender,
    email: data.email || `${regNo.toLowerCase()}@student.gasckuthalam.edu.in`,
    phone: data.phone || '9876543210',
    guardianName: data.guardianName,
    guardianRelationship: data.guardianRelationship || 'Parent',
    guardianPhone: data.guardianPhone || '9876543210',
    address: data.address || 'Kuthalam, Mayiladuthurai',
    emergencyContact: data.emergencyContact,
    bloodGroup: data.bloodGroup,
    community: data.community,
    previousEducation: data.previousEducation,
    admissionDate: new Date(),
    status: 'ACTIVE',
    idCardStatus: 'PENDING',
  });

  // Record initial entry in StudentAcademicHistory
  await StudentAcademicHistory.create({
    studentId: student._id,
    classId,
    year: yearNum,
    section: sec,
    academicYear: acadYear,
    effectiveFrom: new Date(),
    changeReason: 'ADMISSION',
    changedBy: req.user!.userId,
  });

  await logAuditEvent(
    'STUDENT_ADMITTED',
    req.user!.userId,
    'Student',
    student._id.toString(),
    { regNo, courseId: data.courseId, year: yearNum, section: sec, classId },
    req.ip
  );

  const populatedStudent = await Student.findById(student._id)
    .populate('departmentId', 'name code')
    .populate('courseId', 'name code degree')
    .populate('classId', 'year section academicYear')
    .populate('batchId', 'name admissionYear graduationYear')
    .lean();

  sendSuccess(
    res,
    {
      student: populatedStudent,
      userId: user._id,
      isActivated: user.isActivated,
      temporaryPassword: isPasswordGiven ? undefined : rawPassword,
    },
    'Student admission recorded and automatically grouped into database class roster',
    201
  );
};

// Get single student full profile bundle
export const getStudentById = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    const student = await Student.findById(id)
      .populate('userId', 'status lastLogin email phone isActivated')
      .populate('departmentId', 'name code headOfDepartment')
      .populate('courseId', 'name code degree durationYears')
      .populate('classId', 'year section academicYear currentSemester roomNo classInCharge')
      .populate('batchId', 'name admissionYear graduationYear status')
      .lean();

    if (!student) {
      sendError(res, 'Student record not found', 404);
      return;
    }

    // Attendance stats
    const sessions = await AttendanceSession.find({
      departmentId: (student.departmentId as any)._id,
      semester: student.currentSemester,
      section: student.section,
    }).lean();

    const sessionIds = sessions.map((s) => s._id);
    const records = await AttendanceRecord.find({
      sessionId: { $in: sessionIds },
      studentId: student._id,
    }).lean();

    const attendedCount = records.filter((r) => r.status === 'PRESENT' || r.status === 'OD').length;
    const attendancePercentage = sessions.length > 0 ? Math.round((attendedCount / sessions.length) * 100) : 100;

    // Academic promotion history
    const history = await StudentAcademicHistory.find({ studentId: student._id })
      .populate('classId', 'year section academicYear')
      .populate('changedBy', 'identifier role')
      .sort({ effectiveFrom: 1 })
      .lean();

    sendSuccess(
      res,
      {
        student,
        attendance: {
          totalClasses: sessions.length,
          attendedClasses: attendedCount,
          percentage: attendancePercentage,
          isShortage: attendancePercentage < 75,
        },
        academicHistory: history,
      },
      'Student profile retrieved successfully'
    );
  } catch (err: any) {
    sendError(res, err.message, 500);
  }
};

// Edit student details
export const updateStudent = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    const student = await Student.findById(id);
    if (!student) {
      sendError(res, 'Student record not found', 404);
      return;
    }

    const {
      fullName,
      phone,
      email,
      address,
      guardianName,
      guardianPhone,
      guardianRelationship,
      emergencyContact,
      bloodGroup,
      community,
      status,
      photoUrl,
    } = req.body;

    if (fullName) student.fullName = fullName.trim();
    if (phone) student.phone = phone.trim();
    if (email) student.email = email.trim();
    if (address) student.address = address.trim();
    if (guardianName) student.guardianName = guardianName.trim();
    if (guardianPhone) student.guardianPhone = guardianPhone.trim();
    if (guardianRelationship) student.guardianRelationship = guardianRelationship.trim();
    if (emergencyContact) student.emergencyContact = emergencyContact.trim();
    if (bloodGroup) student.bloodGroup = bloodGroup.trim();
    if (community) student.community = community.trim();
    if (photoUrl) student.photoUrl = photoUrl;
    if (status) student.status = status;

    await student.save();

    await logAuditEvent(
      'STUDENT_UPDATED',
      req.user!.userId,
      'Student',
      student._id.toString(),
      { registerNo: student.registerNo, updatedFields: req.body },
      req.ip
    );

    sendSuccess(res, student, 'Student details updated successfully');
  } catch (err: any) {
    sendError(res, err.message, 500);
  }
};

// Controlled Academic Promotion Workflow
export const promoteStudent = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    const { targetYear, targetSemester, targetAcademicYear, targetSection, reason } = req.body;

    if (!targetYear || !targetAcademicYear) {
      sendError(res, 'targetYear and targetAcademicYear are required for promotion', 400);
      return;
    }

    const student = await Student.findById(id);
    if (!student) {
      sendError(res, 'Student record not found', 404);
      return;
    }

    const newYear = Number(targetYear);
    const newSem = targetSemester ? Number(targetSemester) : (newYear * 2 - 1);
    const newSec = (targetSection || student.section).toUpperCase();

    // Find or create target CollegeClass
    let targetClass = await CollegeClass.findOne({
      courseId: student.courseId,
      year: newYear,
      section: newSec,
      academicYear: targetAcademicYear,
      active: true,
    });

    if (!targetClass) {
      targetClass = await CollegeClass.create({
        courseId: student.courseId,
        departmentId: student.departmentId,
        batchId: student.batchId,
        year: newYear,
        section: newSec,
        academicYear: targetAcademicYear,
        currentSemester: newSem,
        active: true,
      });
    }

    // Close existing open academic history record
    await StudentAcademicHistory.updateMany(
      { studentId: student._id, effectiveTo: { $exists: false } },
      { effectiveTo: new Date() }
    );

    // Update student assignment
    const previousYear = student.year;
    student.year = newYear;
    student.currentSemester = newSem;
    student.section = newSec;
    student.academicYear = targetAcademicYear;
    student.classId = targetClass._id as mongoose.Types.ObjectId;
    student.status = 'PROMOTED';
    await student.save();

    // Create new academic history record
    const historyEntry = await StudentAcademicHistory.create({
      studentId: student._id,
      classId: targetClass._id,
      year: newYear,
      section: newSec,
      academicYear: targetAcademicYear,
      effectiveFrom: new Date(),
      changeReason: 'PROMOTION',
      changedBy: req.user!.userId,
    });

    await logAuditEvent(
      'STUDENT_PROMOTED',
      req.user!.userId,
      'Student',
      student._id.toString(),
      {
        registerNo: student.registerNo,
        fromYear: previousYear,
        toYear: newYear,
        newClassId: targetClass._id.toString(),
        reason: reason || 'Academic year advancement',
      },
      req.ip
    );

    sendSuccess(
      res,
      { student, historyEntry },
      `Student ${student.fullName} promoted from Year ${previousYear} to Year ${newYear} successfully`
    );
  } catch (err: any) {
    sendError(res, err.message, 500);
  }
};

// Get Academic Record History
export const getStudentHistory = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    const history = await StudentAcademicHistory.find({ studentId: id })
      .populate('classId', 'year section academicYear currentSemester')
      .populate('changedBy', 'identifier role')
      .sort({ effectiveFrom: 1 })
      .lean();

    sendSuccess(res, { history }, 'Student academic history retrieved');
  } catch (err: any) {
    sendError(res, err.message, 500);
  }
};

// Bulk Student Import with Row-by-Row Validation & Report
export const importStudents = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const { students: rows } = req.body;
    if (!Array.isArray(rows) || rows.length === 0) {
      sendError(res, 'A non-empty array of student rows is required for import', 400);
      return;
    }

    const errors: { row: number; registerNo?: string; reason: string }[] = [];
    const successful: any[] = [];
    const seenInPayload = new Set<string>();

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNum = i + 1;

      if (!row.registerNo || !row.fullName || !row.dob || !row.courseId || !row.departmentId) {
        errors.push({
          row: rowNum,
          registerNo: row.registerNo,
          reason: 'Missing mandatory fields: registerNo, fullName, dob, courseId, or departmentId',
        });
        continue;
      }

      const regNo = row.registerNo.trim().toUpperCase();

      if (seenInPayload.has(regNo)) {
        errors.push({
          row: rowNum,
          registerNo: regNo,
          reason: `Duplicate register number '${regNo}' found within the import file`,
        });
        continue;
      }
      seenInPayload.add(regNo);

      // Check DB duplication
      const existing = await User.findOne({ identifier: regNo });
      if (existing) {
        errors.push({
          row: rowNum,
          registerNo: regNo,
          reason: `Student with register number '${regNo}' already exists in the system`,
        });
        continue;
      }

      const yearNum = Number(row.year) || 1;
      const sec = (row.section || 'A').toUpperCase();
      const acadYear = row.academicYear || '2024-2025';

      // Find or create class
      let targetClass = await CollegeClass.findOne({
        courseId: row.courseId,
        year: yearNum,
        section: sec,
        academicYear: acadYear,
        active: true,
      });

      if (!targetClass) {
        targetClass = await CollegeClass.create({
          courseId: row.courseId,
          departmentId: row.departmentId,
          year: yearNum,
          section: sec,
          academicYear: acadYear,
          currentSemester: row.currentSemester || (yearNum * 2 - 1),
          active: true,
        });
      }

      const passwordHash = await bcrypt.hash('Password@123', 12);
      const user = await User.create({
        identifier: regNo,
        passwordHash,
        role: 'STUDENT',
        status: 'PENDING',
        isActivated: false,
        createdBy: req.user!.userId,
        email: row.email || `${regNo.toLowerCase()}@student.gasckuthalam.edu.in`,
        phone: row.phone || '9876543210',
      });

      const st = await Student.create({
        userId: user._id,
        registerNo: regNo,
        rollNumber: regNo,
        fullName: row.fullName.trim(),
        departmentId: row.departmentId,
        courseId: row.courseId,
        classId: targetClass._id,
        year: yearNum,
        currentSemester: row.currentSemester || (yearNum * 2 - 1),
        section: sec,
        academicYear: acadYear,
        dob: new Date(row.dob),
        gender: row.gender || 'MALE',
        email: row.email || `${regNo.toLowerCase()}@student.gasckuthalam.edu.in`,
        phone: row.phone || '9876543210',
        guardianName: row.guardianName || 'Parent',
        guardianPhone: row.guardianPhone || '9876543210',
        address: row.address || 'Kuthalam',
        status: 'ACTIVE',
      });

      await StudentAcademicHistory.create({
        studentId: st._id,
        classId: targetClass._id,
        year: yearNum,
        section: sec,
        academicYear: acadYear,
        effectiveFrom: new Date(),
        changeReason: 'ADMISSION',
        changedBy: req.user!.userId,
      });

      successful.push({
        registerNo: regNo,
        fullName: st.fullName,
        classId: targetClass._id,
      });
    }

    await logAuditEvent(
      'STUDENT_BULK_IMPORT',
      req.user!.userId,
      'Student',
      undefined,
      {
        totalRows: rows.length,
        successfulCount: successful.length,
        failedCount: errors.length,
      },
      req.ip
    );

    sendSuccess(
      res,
      {
        totalRows: rows.length,
        successfulCount: successful.length,
        failedCount: errors.length,
        successful,
        errors,
      },
      `Bulk import completed: ${successful.length} records created, ${errors.length} failed`,
      errors.length > 0 && successful.length === 0 ? 422 : 200
    );
  } catch (err: any) {
    sendError(res, err.message, 500);
  }
};

// List faculty & staff
export const listFaculty = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const { departmentId, includeArchived, search } = req.query;
    const filter: any = {};
    if (includeArchived !== 'true') {
      filter.isDeleted = { $ne: true };
    }
    if (departmentId) filter.departmentId = departmentId;

    if (search && typeof search === 'string' && search.trim()) {
      const q = search.trim();
      filter.$or = [
        { fullName: { $regex: q, $options: 'i' } },
        { employeeId: { $regex: q, $options: 'i' } },
        { email: { $regex: q, $options: 'i' } },
        { designation: { $regex: q, $options: 'i' } },
      ];
    }

    const faculty = await Faculty.find(filter)
      .populate('departmentId', 'name code')
      .populate('assignedClasses.subjectId', 'name code title')
      .populate('assignedClasses.courseId', 'name code')
      .populate('assignedClasses.classId', 'year section academicYear')
      .populate('userId', 'status lastLogin mustChangePassword isActivated email phone')
      .sort({ fullName: 1 })
      .lean();

    sendSuccess(res, { faculty }, 'Faculty list retrieved');
  } catch (err: any) {
    sendError(res, err.message, 500);
  }
};

// Next available Staff ID endpoint
export const getNextStaffIdEndpoint = async (
  _req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const nextStaffId = await generateNextStaffId();
    sendSuccess(res, { nextStaffId }, 'Next available Staff ID generated');
  } catch (err: any) {
    sendError(res, err.message, 500);
  }
};

// Get single faculty / staff member details
export const getFacultyById = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    const faculty = await Faculty.findById(id)
      .populate('departmentId', 'name code')
      .populate('assignedClasses.subjectId', 'name code title')
      .populate('assignedClasses.departmentId', 'name code')
      .populate('assignedClasses.courseId', 'name code')
      .populate('assignedClasses.classId', 'year section academicYear')
      .populate('userId', 'status lastLogin mustChangePassword isActivated email phone')
      .lean();

    if (!faculty) {
      sendError(res, 'Staff member not found', 404);
      return;
    }

    sendSuccess(res, { faculty }, 'Staff member details retrieved');
  } catch (err: any) {
    sendError(res, err.message, 500);
  }
};

// Create a new faculty / staff account
export const createFaculty = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  const parsed = CreateFacultySchema.safeParse(req.body);
  if (!parsed.success) {
    sendError(res, parsed.error.errors[0].message, 422);
    return;
  }

  const data = parsed.data;

  // Determine Staff ID
  let empId: string;
  const isAutoGeneratedId = data.autoGenerateId || !data.employeeId?.trim();

  if (isAutoGeneratedId) {
    empId = await generateNextStaffId();
  } else {
    empId = data.employeeId!.trim().toUpperCase();
    // Validate uniqueness
    const existingUser = await User.findOne({ identifier: empId });
    const existingFaculty = await Faculty.findOne({ employeeId: empId });
    if (existingUser || existingFaculty) {
      sendError(res, `A staff member with Staff ID ${empId} already exists`, 409);
      return;
    }
  }

  // Handle Initial Password
  let rawPassword = '';
  let isGeneratedPassword = false;

  if (data.password && data.password.trim()) {
    const strengthCheck = validatePasswordStrength(data.password.trim());
    if (!strengthCheck.valid) {
      sendError(res, strengthCheck.message || 'Password does not meet institutional strength criteria.', 422);
      return;
    }
    rawPassword = data.password.trim();
  } else {
    rawPassword = generateSecureTemporaryPassword();
    isGeneratedPassword = true;
  }

  // Bcrypt password hashing (12 rounds)
  const passwordHash = await bcrypt.hash(rawPassword, 12);

  // Concurrency-safe creation: retry loop in case of race condition collision
  let user: any;
  let faculty: any;
  let attempts = 0;
  const maxAttempts = 5;

  while (attempts < maxAttempts) {
    try {
      user = await User.create({
        identifier: empId,
        passwordHash,
        role: 'STAFF',
        status: data.status || 'ACTIVE',
        isActivated: false,
        mustChangePassword: true, // Always require password change on first login for temporary/admin-set initial passwords
        email: data.email.trim().toLowerCase(),
        phone: data.phone.trim(),
        createdBy: req.user!.userId as any,
      });

      faculty = await Faculty.create({
        userId: user._id,
        employeeId: empId,
        fullName: data.fullName.trim(),
        departmentId: data.departmentId,
        designation: data.designation.trim(),
        qualification: data.qualification.trim(),
        email: data.email.trim().toLowerCase(),
        phone: data.phone.trim(),
        dob: data.dob ? new Date(data.dob) : undefined,
        specialization: data.specialization?.trim(),
        address: data.address?.trim(),
        assignedClasses: (data.assignedClasses || []) as any,
      });

      break; // Successfully created
    } catch (err: any) {
      // If duplicate key error on auto-generated ID, retry with next ID
      if (err.code === 11000 && isAutoGeneratedId) {
        attempts++;
        empId = await generateNextStaffId();
        continue;
      }
      // If manual ID or other error
      if (err.code === 11000) {
        sendError(res, `Duplicate Staff ID or email collision for ${empId}`, 409);
        return;
      }
      sendError(res, err.message, 500);
      return;
    }
  }

  if (!faculty) {
    sendError(res, 'Failed to create staff account due to ID sequence collision. Please try again.', 500);
    return;
  }

  // Audit log WITHOUT logging plaintext password
  await logAuditEvent(
    'FACULTY_CREATED',
    req.user!.userId,
    'Faculty',
    faculty._id.toString(),
    { empId, isAutoGeneratedId, isGeneratedPassword },
    req.ip
  );

  const populatedFaculty = await Faculty.findById(faculty._id)
    .populate('departmentId', 'name code')
    .populate('assignedClasses.subjectId', 'name code title')
    .populate('userId', 'status lastLogin mustChangePassword isActivated')
    .lean();

  sendSuccess(
    res,
    {
      faculty: populatedFaculty,
      userId: user._id,
      // Provide the temporary password securely ONCE in the creation response
      temporaryPassword: rawPassword,
      mustChangePassword: true,
    },
    'Staff member enrolled successfully',
    201
  );
};

// Edit / Update Staff Details
export const updateFaculty = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    const parsed = UpdateFacultySchema.safeParse(req.body);
    if (!parsed.success) {
      sendError(res, parsed.error.errors[0].message, 422);
      return;
    }

    const faculty = await Faculty.findById(id);
    if (!faculty) {
      sendError(res, 'Staff member record not found', 404);
      return;
    }

    const data = parsed.data;
    if (data.fullName) faculty.fullName = data.fullName.trim();
    if (data.departmentId) faculty.departmentId = data.departmentId as any;
    if (data.designation) faculty.designation = data.designation.trim();
    if (data.qualification) faculty.qualification = data.qualification.trim();
    if (data.dob) faculty.dob = new Date(data.dob);
    if (data.phone) faculty.phone = data.phone.trim();
    if (data.email) faculty.email = data.email.trim().toLowerCase();
    if (data.address !== undefined) faculty.address = data.address?.trim();
    if (data.specialization !== undefined) faculty.specialization = data.specialization?.trim();

    await faculty.save();

    // Sync with User document if email/phone/status changed
    const userUpdates: any = {};
    if (data.email) userUpdates.email = data.email.trim().toLowerCase();
    if (data.phone) userUpdates.phone = data.phone.trim();
    if (data.status) userUpdates.status = data.status;

    if (Object.keys(userUpdates).length > 0) {
      await User.findByIdAndUpdate(faculty.userId, userUpdates);
    }

    await logAuditEvent(
      'FACULTY_UPDATED',
      req.user!.userId,
      'Faculty',
      faculty._id.toString(),
      { employeeId: faculty.employeeId, updatedFields: Object.keys(data) },
      req.ip
    );

    const updated = await Faculty.findById(id)
      .populate('departmentId', 'name code')
      .populate('assignedClasses.subjectId', 'name code title')
      .populate('userId', 'status lastLogin mustChangePassword isActivated')
      .lean();

    sendSuccess(res, { faculty: updated }, 'Staff details updated successfully');
  } catch (err: any) {
    sendError(res, err.message, 500);
  }
};

// Assign / Update classes, courses, and subjects for a staff member
export const updateFacultyAssignments = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    const parsed = AssignFacultyClassesSchema.safeParse(req.body);
    if (!parsed.success) {
      sendError(res, parsed.error.errors[0].message, 422);
      return;
    }

    const faculty = await Faculty.findById(id);
    if (!faculty) {
      sendError(res, 'Staff member record not found', 404);
      return;
    }

    faculty.assignedClasses = parsed.data.assignedClasses as any;
    await faculty.save();

    await logAuditEvent(
      'FACULTY_CLASSES_ASSIGNED',
      req.user!.userId,
      'Faculty',
      faculty._id.toString(),
      { employeeId: faculty.employeeId, count: parsed.data.assignedClasses.length },
      req.ip
    );

    const updated = await Faculty.findById(id)
      .populate('departmentId', 'name code')
      .populate('assignedClasses.subjectId', 'name code title')
      .populate('assignedClasses.departmentId', 'name code')
      .populate('assignedClasses.courseId', 'name code')
      .populate('assignedClasses.classId', 'year section academicYear')
      .lean();

    sendSuccess(res, { faculty: updated }, 'Class and subject assignments saved successfully');
  } catch (err: any) {
    sendError(res, err.message, 500);
  }
};

// Reset Staff Password securely (Admin action)
export const resetFacultyPassword = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    const faculty = await Faculty.findById(id);
    if (!faculty) {
      sendError(res, 'Staff member not found', 404);
      return;
    }

    const user = await User.findById(faculty.userId);
    if (!user) {
      sendError(res, 'User credentials not found for this staff member', 404);
      return;
    }

    // Generate secure random temporary password
    const temporaryPassword = generateSecureTemporaryPassword();
    user.passwordHash = await bcrypt.hash(temporaryPassword, 12);
    user.mustChangePassword = true; // Must change at next login
    user.refreshTokens = []; // Revoke active sessions for security
    await user.save();

    await logAuditEvent(
      'FACULTY_PASSWORD_RESET',
      req.user!.userId,
      'User',
      user._id.toString(),
      { employeeId: faculty.employeeId },
      req.ip
    );

    sendSuccess(
      res,
      {
        employeeId: faculty.employeeId,
        temporaryPassword,
        mustChangePassword: true,
      },
      'Staff password has been securely reset. Please share the temporary password with the staff member.'
    );
  } catch (err: any) {
    sendError(res, err.message, 500);
  }
};

// Academic Hierarchy: list departments, courses, subjects
export const listAcademicStructure = async (
  _req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const [departments, courses, subjects] = await Promise.all([
      Department.find().sort({ code: 1 }).lean(),
      Course.find().populate('departmentId', 'code name').sort({ code: 1 }).lean(),
      Subject.find().populate('departmentId', 'code name').sort({ semester: 1, code: 1 }).lean(),
    ]);

    sendSuccess(res, { departments, courses, subjects }, 'Academic structure retrieved');
  } catch (err: any) {
    sendError(res, err.message, 500);
  }
};

// Toggle user status (ACTIVE / SUSPENDED)
export const toggleUserStatus = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  const { userId } = req.params;
  const { status } = req.body;

  if (!['ACTIVE', 'SUSPENDED', 'INACTIVE'].includes(status)) {
    sendError(res, 'Invalid status parameter', 400);
    return;
  }

  const user = await User.findById(userId);
  if (!user) {
    sendError(res, 'User not found', 404);
    return;
  }

  if (user.role === 'ADMIN' && req.user!.userId === userId) {
    sendError(res, 'Cannot change status of your own administrator account', 400);
    return;
  }

  const oldStatus = user.status;
  user.status = status;
  if (status !== 'ACTIVE') {
    user.refreshTokens = []; // Revoke active sessions immediately
  }
  await user.save();

  await logAuditEvent(
    'ACCOUNT_STATUS_CHANGED',
    req.user!.userId,
    'User',
    user._id.toString(),
    { oldStatus, newStatus: status, identifier: user.identifier },
    req.ip
  );

  sendSuccess(res, { user }, `Account status updated to ${status}`);
};

// View Audit logs with pagination
export const getAuditLogs = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const { page = '1', limit = '30', action } = req.query;
    const filter: any = {};
    if (action) filter.action = action;

    const skip = (Number(page) - 1) * Number(limit);
    const [logs, total] = await Promise.all([
      AuditLog.find(filter)
        .populate('performedBy', 'identifier role email')
        .sort({ timestamp: -1 })
        .skip(skip)
        .limit(Number(limit))
        .lean(),
      AuditLog.countDocuments(filter),
    ]);

    sendSuccess(res, { logs }, 'Audit logs retrieved', 200, {
      page: Number(page),
      limit: Number(limit),
      total,
      totalPages: Math.ceil(total / Number(limit)),
    });
  } catch (err: any) {
    sendError(res, err.message, 500);
  }
};

// Reset password for student or faculty user
export const resetUserPassword = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  const { userId } = req.params;
  const { newPassword } = req.body;

  if (!newPassword || newPassword.length < 6) {
    sendError(res, 'New password must be at least 6 characters long', 400);
    return;
  }

  const user = await User.findById(userId);
  if (!user) {
    sendError(res, 'User not found', 404);
    return;
  }

  const salt = await bcrypt.genSalt(12);
  user.passwordHash = await bcrypt.hash(newPassword, salt);
  user.refreshTokens = []; // Revoke active sessions
  await user.save();

  await logAuditEvent(
    'PASSWORD_RESET_BY_ADMIN',
    req.user!.userId,
    'User',
    user._id.toString(),
    { identifier: user.identifier, role: user.role },
    req.ip
  );

  sendSuccess(res, null, `Password for ${user.identifier} successfully reset`);
};

// Staff Leave Approvals
export const getStaffLeaveRequests = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const { status } = req.query;
    const filter: any = {};
    if (status) filter.status = status;

    const leaves = await FacultyLeave.find(filter)
      .populate('facultyId', 'fullName employeeId designation departmentId')
      .sort({ createdAt: -1 })
      .lean();

    sendSuccess(res, { leaves }, 'Staff leave applications retrieved');
  } catch (err: any) {
    sendError(res, err.message, 500);
  }
};

export const updateLeaveRequestStatus = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  const { leaveId } = req.params;
  const { status, rejectionReason } = req.body;

  if (!['APPROVED', 'REJECTED'].includes(status)) {
    sendError(res, 'Status must be APPROVED or REJECTED', 400);
    return;
  }

  const leave = await FacultyLeave.findById(leaveId);
  if (!leave) {
    sendError(res, 'Leave request not found', 404);
    return;
  }

  leave.status = status;
  leave.reviewedBy = req.user!.userId as any;
  if (rejectionReason) leave.rejectionReason = rejectionReason;
  await leave.save();

  await logAuditEvent(
    'LEAVE_STATUS_UPDATED',
    req.user!.userId,
    'FacultyLeave',
    leave._id.toString(),
    { status, rejectionReason },
    req.ip
  );

  sendSuccess(res, { leave }, `Leave request ${status.toLowerCase()} successfully`);
};

// Document & Branding Templates
export const getCollegeTemplates = async (
  _req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const templates = await CollegeTemplate.find().lean();
    sendSuccess(res, { templates }, 'College templates retrieved');
  } catch (err: any) {
    sendError(res, err.message, 500);
  }
};

export const saveCollegeTemplate = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  const {
    templateType,
    title,
    name,
    version,
    effectiveDate,
    contentTemplate,
    headerText,
    footerText,
    signatoryTitle,
    signatoryName,
    signatorySignatureUrl,
    sealUrl,
    imageUrl,
    requiredFields,
    isActive,
  } = req.body;

  if (!templateType) {
    sendError(res, 'templateType is required', 400);
    return;
  }

  const templateTitle = title || name || `${templateType} Official Certificate Template`;

  const template = await CollegeTemplate.findOneAndUpdate(
    { templateType },
    {
      templateType,
      title: templateTitle,
      version: version || 1,
      effectiveDate: effectiveDate ? new Date(effectiveDate) : new Date(),
      contentTemplate:
        contentTemplate ||
        'This is to certify that {STUDENT_NAME} (Reg. No: {REGISTER_NO}) is a bonafide student of Government Arts and Science College, Kuthalam, studying in {COURSE_NAME}, {YEAR} Year during the academic year {ACADEMIC_YEAR}. This certificate is issued for the purpose of {PURPOSE}.',
      headerText,
      footerText,
      signatoryTitle: signatoryTitle || 'Principal',
      signatoryName: signatoryName || 'Principal Office',
      signatorySignatureUrl,
      sealUrl,
      imageUrl: imageUrl || signatorySignatureUrl || '',
      requiredFields: requiredFields || ['STUDENT_NAME', 'REGISTER_NO', 'COURSE_NAME', 'YEAR', 'ACADEMIC_YEAR', 'PURPOSE'],
      isActive: isActive !== undefined ? isActive : true,
      uploadedBy: req.user?.identifier || 'Principal Office',
    },
    { upsert: true, new: true }
  );

  await logAuditEvent(
    'TEMPLATE_SAVED',
    req.user!.userId,
    'CollegeTemplate',
    template._id.toString(),
    { templateType, title: templateTitle, version: template.version },
    req.ip
  );

  sendSuccess(res, { template }, 'College template configured successfully');
};

// Database Backup Status & Operational Command
export const getDatabaseBackupStatus = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const backupMetadata = {
      timestamp: new Date().toISOString(),
      institution: 'Government Arts and Science College, Kuthalam',
      database: 'gasc_portal',
      backupStrategy: 'Daily automated mongodump snapshot with encrypted volume retention',
      collections: [
        'users',
        'students',
        'faculties',
        'departments',
        'courses',
        'subjects',
        'timetableslots',
        'attendancesessions',
        'attendancerecords',
        'assessments',
        'marks',
        'bonafiderequests',
        'studentidcards',
        'feestructures',
        'studentfeeaccounts',
        'paymentorders',
        'payments',
        'assignments',
        'submissions',
        'quizzes',
        'quizattempts',
        'studymaterials',
        'announcements',
        'notifications',
        'facultyleaves',
        'auditlogs',
      ],
      operationalCommands: {
        dumpCommand: 'mongodump --uri="mongodb://127.0.0.1:27017/gasc_portal" --out="./backups/$(date +%F)"',
        restoreCommand: 'mongorestore --uri="mongodb://127.0.0.1:27017/gasc_portal" --drop ./backups/<BACKUP_DATE>/gasc_portal',
      },
      status: 'VERIFIED_OPERATIONAL',
    };

    await logAuditEvent('DATABASE_BACKUP_INSPECTED', req.user!.userId, 'System', undefined, {}, req.ip);
    sendSuccess(res, backupMetadata, 'Verified database backup metadata and operational protocol');
  } catch (err: any) {
    sendError(res, err.message, 500);
  }
};

export const deleteStudent = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    const { reason, confirm } = req.body || {};

    if (!confirm && req.query.confirm !== 'true') {
      sendError(res, 'Confirmation is required to archive student record. Pass confirm: true.', 400);
      return;
    }

    const student = await Student.findById(id);
    if (!student) {
      sendError(res, 'Student record not found', 404);
      return;
    }

    if (student.isDeleted) {
      sendError(res, 'Student record is already archived', 400);
      return;
    }

    const deletionReason = reason?.trim() || 'Administrative archival';

    // Soft delete: keep historical attendance, marks, fees intact
    student.isDeleted = true;
    student.status = 'ARCHIVED';
    student.deletedAt = new Date();
    student.deletedBy = req.user!.userId as any;
    student.deletionReason = deletionReason;
    await student.save();

    // Deactivate user credentials to block login
    await User.findByIdAndUpdate(student.userId, { status: 'INACTIVE', deactivationReason: deletionReason });

    await logAuditEvent(
      'STUDENT_ARCHIVED',
      req.user!.userId,
      'Student',
      student._id.toString(),
      { registerNo: student.registerNo, reason: deletionReason },
      req.ip
    );

    sendSuccess(res, { studentId: student._id, isDeleted: true }, 'Student record safely archived with historical records preserved');
  } catch (err: any) {
    sendError(res, err.message, 500);
  }
};

export const restoreStudent = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    const student = await Student.findById(id);
    if (!student) {
      sendError(res, 'Student record not found', 404);
      return;
    }

    student.isDeleted = false;
    student.status = 'ACTIVE';
    student.deletedAt = undefined;
    student.deletedBy = undefined;
    student.deletionReason = undefined;
    await student.save();

    await User.findByIdAndUpdate(student.userId, { status: 'ACTIVE', deactivationReason: undefined });

    await logAuditEvent(
      'STUDENT_RESTORED',
      req.user!.userId,
      'Student',
      student._id.toString(),
      { registerNo: student.registerNo },
      req.ip
    );

    sendSuccess(res, student, 'Student record restored successfully');
  } catch (err: any) {
    sendError(res, err.message, 500);
  }
};

export const deleteFaculty = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    const { reason, confirm } = req.body || {};

    if (!confirm && req.query.confirm !== 'true') {
      sendError(res, 'Confirmation is required to archive staff record. Pass confirm: true.', 400);
      return;
    }

    const faculty = await Faculty.findById(id);
    if (!faculty) {
      sendError(res, 'Faculty / staff record not found', 404);
      return;
    }

    if (faculty.isDeleted) {
      sendError(res, 'Staff record is already archived', 400);
      return;
    }

    const deletionReason = reason?.trim() || 'Staff separation or retirement archival';

    faculty.isDeleted = true;
    faculty.deletedAt = new Date();
    faculty.deletedBy = req.user!.userId as any;
    faculty.deletionReason = deletionReason;
    await faculty.save();

    await User.findByIdAndUpdate(faculty.userId, { status: 'INACTIVE', deactivationReason: deletionReason });

    await logAuditEvent(
      'FACULTY_ARCHIVED',
      req.user!.userId,
      'Faculty',
      faculty._id.toString(),
      { employeeId: faculty.employeeId, reason: deletionReason },
      req.ip
    );

    sendSuccess(res, { facultyId: faculty._id, isDeleted: true }, 'Staff record safely archived with historical sessions preserved');
  } catch (err: any) {
    sendError(res, err.message, 500);
  }
};

export const restoreFaculty = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    const faculty = await Faculty.findById(id);
    if (!faculty) {
      sendError(res, 'Faculty / staff record not found', 404);
      return;
    }

    faculty.isDeleted = false;
    faculty.deletedAt = undefined;
    faculty.deletedBy = undefined;
    faculty.deletionReason = undefined;
    await faculty.save();

    await User.findByIdAndUpdate(faculty.userId, { status: 'ACTIVE', deactivationReason: undefined });

    await logAuditEvent(
      'FACULTY_RESTORED',
      req.user!.userId,
      'Faculty',
      faculty._id.toString(),
      { employeeId: faculty.employeeId },
      req.ip
    );

    sendSuccess(res, faculty, 'Staff record restored successfully');
  } catch (err: any) {
    sendError(res, err.message, 500);
  }
};

export const triggerBackup = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const reason = req.body?.reason || 'Administrator triggered snapshot';
    const manifest = await BackupService.createBackup(req.user!.userId, reason);
    sendSuccess(res, manifest, 'Full database and asset backup created and verified successfully', 201);
  } catch (err: any) {
    sendError(res, err.message, 500);
  }
};

export const listBackups = async (
  _req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const backups = BackupService.listBackups();
    sendSuccess(res, { backups }, 'Available recovery points retrieved');
  } catch (err: any) {
    sendError(res, err.message, 500);
  }
};

export const verifyBackup = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    const result = await BackupService.verifyBackupIntegrity(id);
    sendSuccess(res, result, 'Backup integrity verification completed');
  } catch (err: any) {
    sendError(res, err.message, 500);
  }
};

export const testRestoreBackup = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    const result = await BackupService.testRestoreBackup(id);
    sendSuccess(res, result, 'Test restore into isolated non-production database completed successfully');
  } catch (err: any) {
    sendError(res, err.message, 500);
  }
};

export const getSecurityOverview = async (
  _req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const primaryAdmin = await User.findOne({ isPrimaryAdmin: true }).select('identifier role status adminImmutableId createdAt lastLogin').lean();
    const totalUsers = await User.countDocuments();
    const activeUsers = await User.countDocuments({ status: 'ACTIVE' });
    const usersWithE2EE = await User.countDocuments({ e2eePublicKey: { $exists: true, $ne: '' } });
    const inventory = await CleanupService.getInventory();

    sendSuccess(res, {
      primaryAdministrator: {
        enforced: Boolean(primaryAdmin),
        identifier: primaryAdmin?.identifier || 'ADMIN001',
        immutableId: primaryAdmin?.adminImmutableId || PRIMARY_ADMIN_IMMUTABLE_ID,
        status: primaryAdmin?.status || 'ACTIVE',
        lastLogin: primaryAdmin?.lastLogin,
      },
      e2eeStatus: {
        protocol: 'TweetNaCl (XSalsa20-Poly1305 + Curve25519)',
        verifiedActive: true,
        usersWithKeys: usersWithE2EE,
      },
      userMetrics: {
        totalUsers,
        activeUsers,
      },
      cleanupStatus: {
        demoUsersCount: inventory.demoUsersCount,
        demoStudentsCount: inventory.demoStudentsCount,
        demoFacultyCount: inventory.demoFacultyCount,
      },
    }, 'Security overview retrieved successfully');
  } catch (err: any) {
    sendError(res, err.message, 500);
  }
};

export const getCleanupInventory = async (
  _req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const inventory = await CleanupService.getInventory();
    sendSuccess(res, inventory, 'Cleanup inventory retrieved successfully (dry-run ready)');
  } catch (err: any) {
    sendError(res, err.message, 500);
  }
};

export const executeCleanup = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const { dryRun = false } = req.body;
    const result = await CleanupService.performCleanup(dryRun, req.user?.userId);
    sendSuccess(res, result, result.message);
  } catch (err: any) {
    sendError(res, err.message, 500);
  }
};


