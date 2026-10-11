import { Response } from 'express';
import mongoose from 'mongoose';
import { z } from 'zod';
import {
  AttendanceSession,
  AttendanceRecord,
  Student,
  Faculty,
  Subject,
  CollegeClass,
} from '../../models';
import { AuthenticatedRequest } from '../../types';
import { sendError, sendSuccess } from '../../utils/response';
import { logAuditEvent } from '../../middleware/audit';

const RecordAttendanceSchema = z.object({
  academicYear: z.string().min(1),
  semester: z.number().min(1).max(8),
  departmentId: z.string().min(1),
  section: z.string().min(1),
  subjectId: z.string().min(1),
  date: z.string(), // ISO string or YYYY-MM-DD
  period: z.number().min(1).max(8),
  records: z.array(
    z.object({
      studentId: z.string(),
      status: z.enum(['PRESENT', 'ABSENT', 'OD', 'EXCUSED']),
      remarks: z.string().optional(),
    })
  ),
});

const UpdateRecordSchema = z.object({
  status: z.enum(['PRESENT', 'ABSENT', 'OD', 'EXCUSED']),
  reasonForChange: z.string().min(4, 'A valid reason is required for attendance correction'),
  remarks: z.string().optional(),
});

// Get enrolled students for taking attendance
export const getStudentsForAttendance = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const { departmentId, semester, section } = req.query;

    if (!departmentId || !semester || !section) {
      sendError(res, 'departmentId, semester, and section are required parameters', 400);
      return;
    }

    const students = await Student.find({
      departmentId,
      currentSemester: Number(semester),
      section: (section as string).toUpperCase(),
    })
      .select('_id registerNo fullName photoUrl')
      .sort({ registerNo: 1 })
      .lean();

    sendSuccess(res, { students, total: students.length }, 'Enrolled students retrieved');
  } catch (err: any) {
    sendError(res, err.message, 500);
  }
};

// Create attendance session and individual student records
export const createAttendanceSession = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  const parsed = RecordAttendanceSchema.safeParse(req.body);
  if (!parsed.success) {
    sendError(res, parsed.error.errors[0].message, 422);
    return;
  }

  const data = parsed.data;
  const attendanceDate = new Date(data.date);
  attendanceDate.setUTCHours(0, 0, 0, 0);

  // If user is FACULTY, verify faculty profile
  let facultyObjectId: mongoose.Types.ObjectId;
  if (req.user!.role === 'FACULTY') {
    const faculty = await Faculty.findOne({ userId: req.user!.userId });
    if (!faculty) {
      sendError(res, 'Faculty profile not found', 403);
      return;
    }
    facultyObjectId = faculty._id as mongoose.Types.ObjectId;
  } else {
    // Admin taking or finalizing
    const existingFaculty = await Faculty.findOne({ departmentId: data.departmentId });
    facultyObjectId = existingFaculty?._id as mongoose.Types.ObjectId || new mongoose.Types.ObjectId();
  }

  // Check for duplicate session: same department, semester, section, subject, date, and period
  const existingSession = await AttendanceSession.findOne({
    departmentId: data.departmentId,
    semester: data.semester,
    section: data.section.toUpperCase(),
    subjectId: data.subjectId,
    date: attendanceDate,
    period: data.period,
  });

  if (existingSession) {
    sendError(
      res,
      `Attendance for this class, subject, date (${data.date}), and period (${data.period}) has already been recorded!`,
      409
    );
    return;
  }

  // Compute stats
  let presentCount = 0;
  let absentCount = 0;
  data.records.forEach((r) => {
    if (r.status === 'PRESENT' || r.status === 'OD') {
      presentCount++;
    } else {
      absentCount++;
    }
  });

  // Create session
  const session = await AttendanceSession.create({
    academicYear: data.academicYear,
    semester: data.semester,
    departmentId: data.departmentId,
    section: data.section.toUpperCase(),
    subjectId: data.subjectId,
    facultyId: facultyObjectId,
    date: attendanceDate,
    period: data.period,
    totalStudents: data.records.length,
    presentCount,
    absentCount,
    isFinalized: true,
  });

  // Bulk create records
  const recordDocs = data.records.map((r) => ({
    sessionId: session._id,
    studentId: r.studentId,
    status: r.status,
    remarks: r.remarks,
  }));

  await AttendanceRecord.insertMany(recordDocs);

  await logAuditEvent(
    'ATTENDANCE_RECORDED',
    req.user!.userId,
    'AttendanceSession',
    session._id.toString(),
    {
      subjectId: data.subjectId,
      date: data.date,
      period: data.period,
      presentCount,
      absentCount,
    },
    req.ip
  );

  sendSuccess(res, session, 'Attendance session saved successfully', 201);
};

// Get session history with filters
export const getAttendanceHistory = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const { departmentId, semester, section, subjectId, date } = req.query;
    const filter: any = {};

    if (departmentId) filter.departmentId = departmentId;
    if (semester) filter.semester = Number(semester);
    if (section) filter.section = (section as string).toUpperCase();
    if (subjectId) filter.subjectId = subjectId;
    if (date) {
      const d = new Date(date as string);
      d.setUTCHours(0, 0, 0, 0);
      filter.date = d;
    }

    // If Faculty, filter by their assigned department or faculty ID
    if (req.user!.role === 'FACULTY') {
      const faculty = await Faculty.findOne({ userId: req.user!.userId });
      if (faculty) {
        filter.facultyId = faculty._id;
      }
    }

    const sessions = await AttendanceSession.find(filter)
      .populate('departmentId', 'name code')
      .populate('subjectId', 'title code')
      .populate('facultyId', 'fullName employeeId')
      .sort({ date: -1, period: -1 })
      .limit(50)
      .lean();

    sendSuccess(res, { sessions }, 'Attendance history retrieved');
  } catch (err: any) {
    sendError(res, err.message, 500);
  }
};

// Get records of a specific session
export const getSessionDetails = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    const session = await AttendanceSession.findById(id)
      .populate('departmentId', 'name code')
      .populate('subjectId', 'title code')
      .populate('facultyId', 'fullName')
      .lean();

    if (!session) {
      sendError(res, 'Attendance session not found', 404);
      return;
    }

    const records = await AttendanceRecord.find({ sessionId: id })
      .populate('studentId', 'fullName registerNo photoUrl')
      .lean();

    sendSuccess(res, { session, records }, 'Session details retrieved');
  } catch (err: any) {
    sendError(res, err.message, 500);
  }
};

// Authorized correction with reason and audit log
export const updateAttendanceRecord = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  const { recordId } = req.params;
  const parsed = UpdateRecordSchema.safeParse(req.body);
  if (!parsed.success) {
    sendError(res, parsed.error.errors[0].message, 422);
    return;
  }

  const record = await AttendanceRecord.findById(recordId);
  if (!record) {
    sendError(res, 'Attendance record not found', 404);
    return;
  }

  const oldStatus = record.status;
  const { status, reasonForChange, remarks } = parsed.data;

  record.status = status;
  record.reasonForChange = reasonForChange;
  if (remarks) record.remarks = remarks;
  record.modifiedBy = new mongoose.Types.ObjectId(req.user!.userId);
  record.modifiedAt = new Date();

  await record.save();

  // Recalculate session present/absent count
  const allRecords = await AttendanceRecord.find({ sessionId: record.sessionId });
  let presentCount = 0;
  let absentCount = 0;
  allRecords.forEach((r) => {
    if (r.status === 'PRESENT' || r.status === 'OD') presentCount++;
    else absentCount++;
  });

  await AttendanceSession.findByIdAndUpdate(record.sessionId, {
    presentCount,
    absentCount,
  });

  await logAuditEvent(
    'ATTENDANCE_CORRECTION',
    req.user!.userId,
    'AttendanceRecord',
    record._id.toString(),
    {
      oldStatus,
      newStatus: status,
      reason: reasonForChange,
    },
    req.ip
  );

  sendSuccess(res, record, 'Attendance record updated with audit record');
};

// Attendance comprehensive reports (subject-wise, semester-wise, overall)
export const getAttendanceReports = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const { departmentId, semester, section } = req.query;
    if (!departmentId || !semester || !section) {
      sendError(res, 'departmentId, semester, and section are required', 400);
      return;
    }

    const students = await Student.find({
      departmentId,
      currentSemester: Number(semester),
      section: (section as string).toUpperCase(),
    }).sort({ registerNo: 1 }).lean();

    const sessions = await AttendanceSession.find({
      departmentId,
      semester: Number(semester),
      section: (section as string).toUpperCase(),
    }).lean();

    const sessionIds = sessions.map((s) => s._id);
    const records = await AttendanceRecord.find({ sessionId: { $in: sessionIds } }).lean();

    // Map by studentId -> session count
    const studentStats: { [studentId: string]: { attended: number; total: number } } = {};
    students.forEach((st) => {
      studentStats[st._id.toString()] = { attended: 0, total: sessions.length };
    });

    records.forEach((r) => {
      const stId = r.studentId.toString();
      if (studentStats[stId] && (r.status === 'PRESENT' || r.status === 'OD')) {
        studentStats[stId].attended += 1;
      }
    });

    const report = students.map((st) => {
      const stat = studentStats[st._id.toString()] || { attended: 0, total: sessions.length };
      const percentage = stat.total > 0 ? Math.round((stat.attended / stat.total) * 100) : 100;
      return {
        studentId: st._id,
        registerNo: st.registerNo,
        fullName: st.fullName,
        totalClasses: stat.total,
        attendedClasses: stat.attended,
        percentage,
        isLowAttendance: percentage < 75,
      };
    });

    sendSuccess(
      res,
      {
        totalClassesHeld: sessions.length,
        totalStudentsEnrolled: students.length,
        report,
      },
      'Attendance report generated'
    );
  } catch (err: any) {
    sendError(res, err.message, 500);
  }
};

// Detailed student-wise attendance report
export const getStudentAttendanceReport = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const { studentId } = req.params;

    // Security check: if student role, can only view own report
    if (req.user!.role === 'STUDENT') {
      const selfStudent = await Student.findOne({ userId: req.user!.userId }).lean();
      if (!selfStudent || selfStudent._id.toString() !== studentId) {
        sendError(res, 'Access denied: You cannot view attendance records of other students', 403);
        return;
      }
    }

    const student = await Student.findById(studentId)
      .populate('departmentId', 'name code')
      .populate('courseId', 'name code')
      .populate('classId', 'year section academicYear')
      .lean();

    if (!student) {
      sendError(res, 'Student record not found', 404);
      return;
    }

    const sessions = await AttendanceSession.find({
      departmentId: (student.departmentId as any)._id,
      semester: student.currentSemester,
      section: student.section,
    })
      .populate('subjectId', 'title code credits')
      .populate('facultyId', 'fullName')
      .sort({ date: -1, period: -1 })
      .lean();

    const sessionIds = sessions.map((s) => s._id);
    const records = await AttendanceRecord.find({
      sessionId: { $in: sessionIds },
      studentId: student._id,
    }).lean();

    const recordMap = new Map<string, any>();
    records.forEach((r) => recordMap.set(r.sessionId.toString(), r));

    let attendedCount = 0;
    const history = sessions.map((s) => {
      const rec = recordMap.get(s._id.toString());
      const isPresent = rec && (rec.status === 'PRESENT' || rec.status === 'OD');
      if (isPresent) attendedCount++;

      return {
        sessionId: s._id,
        date: s.date,
        period: s.period,
        subject: (s.subjectId as any)?.title,
        subjectCode: (s.subjectId as any)?.code,
        faculty: (s.facultyId as any)?.fullName,
        status: rec ? rec.status : 'ABSENT',
        reasonForChange: rec?.reasonForChange,
      };
    });

    const percentage = sessions.length > 0 ? Math.round((attendedCount / sessions.length) * 100) : 100;

    sendSuccess(
      res,
      {
        student: {
          _id: student._id,
          registerNo: student.registerNo,
          fullName: student.fullName,
          department: (student.departmentId as any)?.name,
          course: (student.courseId as any)?.name,
          year: student.year,
          section: student.section,
          semester: student.currentSemester,
        },
        summary: {
          totalClassesHeld: sessions.length,
          attendedClasses: attendedCount,
          percentage,
          isShortage: percentage < 75,
        },
        history,
      },
      'Student attendance report retrieved'
    );
  } catch (err: any) {
    sendError(res, err.message, 500);
  }
};

// Class-wise attendance report
export const getClassAttendanceReport = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const { classId } = req.params;
    const cls = await CollegeClass.findById(classId)
      .populate('courseId', 'name code')
      .populate('departmentId', 'name code')
      .lean();

    if (!cls) {
      sendError(res, 'Class record not found', 404);
      return;
    }

    const students = await Student.find({
      $or: [
        { classId: cls._id },
        { courseId: cls.courseId?._id || cls.courseId, year: cls.year, section: cls.section },
      ],
    })
      .sort({ registerNo: 1 })
      .lean();

    const sessions = await AttendanceSession.find({
      departmentId: cls.departmentId?._id || cls.departmentId,
      semester: cls.currentSemester,
      section: cls.section,
    })
      .populate('subjectId', 'title code')
      .populate('facultyId', 'fullName')
      .sort({ date: -1, period: -1 })
      .lean();

    const sessionIds = sessions.map((s) => s._id);
    const records = await AttendanceRecord.find({ sessionId: { $in: sessionIds } }).lean();

    const studentMap: { [id: string]: { attended: number; total: number } } = {};
    students.forEach((st) => {
      studentMap[st._id.toString()] = { attended: 0, total: sessions.length };
    });

    records.forEach((r) => {
      const sId = r.studentId.toString();
      if (studentMap[sId] && (r.status === 'PRESENT' || r.status === 'OD')) {
        studentMap[sId].attended++;
      }
    });

    const studentReports = students.map((st) => {
      const stat = studentMap[st._id.toString()] || { attended: 0, total: sessions.length };
      const percentage = stat.total > 0 ? Math.round((stat.attended / stat.total) * 100) : 100;
      return {
        studentId: st._id,
        registerNo: st.registerNo,
        fullName: st.fullName,
        attended: stat.attended,
        total: stat.total,
        percentage,
        isShortage: percentage < 75,
      };
    });

    sendSuccess(
      res,
      {
        class: cls,
        totalClassesHeld: sessions.length,
        totalStudentsEnrolled: students.length,
        students: studentReports,
      },
      'Class attendance report retrieved'
    );
  } catch (err: any) {
    sendError(res, err.message, 500);
  }
};

