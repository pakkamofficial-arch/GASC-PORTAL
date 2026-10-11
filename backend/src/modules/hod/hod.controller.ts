import { Response } from 'express';
import { z } from 'zod';
import mongoose from 'mongoose';
import {
  Department,
  Course,
  CollegeClass,
  Faculty,
  Student,
  Subject,
  TimetableSlot,
  AttendanceSession,
  AttendanceRecord,
  AuditLog,
} from '../../models';
import { AuthenticatedRequest } from '../../types';
import { sendError, sendSuccess } from '../../utils/response';
import { logAuditEvent } from '../../middleware/audit';

// Helper to resolve HOD's department ID
const resolveHodDepartment = async (req: AuthenticatedRequest): Promise<mongoose.Types.ObjectId | null> => {
  if (req.user!.role === 'ADMIN') {
    // Admin can supply departmentId in query or defaults to first department
    if (req.query.departmentId) {
      return new mongoose.Types.ObjectId(req.query.departmentId as string);
    }
    const firstDept = await Department.findOne().lean();
    return firstDept ? (firstDept._id as mongoose.Types.ObjectId) : null;
  }

  // Find faculty record for the user
  const faculty = await Faculty.findOne({ userId: req.user!.userId }).lean();
  if (faculty && faculty.departmentId) {
    return faculty.departmentId as mongoose.Types.ObjectId;
  }

  return null;
};

// HOD Dashboard with real aggregated metrics
export const getHODDashboard = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const departmentId = await resolveHodDepartment(req);
    if (!departmentId) {
      sendError(res, 'No assigned department found for this user', 404);
      return;
    }

    const dept = await Department.findById(departmentId)
      .populate('hodFacultyId', 'fullName employeeId designation email phone')
      .lean();

    if (!dept) {
      sendError(res, 'Department record not found', 404);
      return;
    }

    const todayStart = new Date();
    todayStart.setUTCHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setUTCHours(23, 59, 59, 999);

    const dayName = new Date()
      .toLocaleDateString('en-US', { weekday: 'long' })
      .toUpperCase() as any;

    const [
      totalStudents,
      totalFaculty,
      activeClasses,
      courses,
      todayScheduledPeriods,
      todayCompletedSessions,
      allSessions,
    ] = await Promise.all([
      Student.countDocuments({ departmentId }),
      Faculty.countDocuments({ departmentId }),
      CollegeClass.find({ departmentId, active: true })
        .populate('courseId', 'name code')
        .populate('classInCharge', 'fullName employeeId designation')
        .lean(),
      Course.find({ departmentId }).lean(),
      TimetableSlot.find({ departmentId, dayOfWeek: dayName })
        .populate('subjectId', 'title code')
        .populate('facultyId', 'fullName employeeId')
        .lean(),
      AttendanceSession.find({
        departmentId,
        date: { $gte: todayStart, $lte: todayEnd },
      }).lean(),
      AttendanceSession.find({ departmentId }).lean(),
    ]);

    const completedSessionIds = todayCompletedSessions.map((s) => s.period);
    const pendingPeriodsCount = Math.max(0, todayScheduledPeriods.length - todayCompletedSessions.length);

    // Calculate students with attendance shortages (<75%)
    const sessionIds = allSessions.map((s) => s._id);
    const allRecords = await AttendanceRecord.find({
      sessionId: { $in: sessionIds },
    }).lean();

    const studentAttendanceMap: { [id: string]: { attended: number; total: number } } = {};
    const studentsInDept = await Student.find({ departmentId }).select('_id registerNo fullName year section').lean();

    studentsInDept.forEach((st) => {
      studentAttendanceMap[st._id.toString()] = { attended: 0, total: allSessions.length };
    });

    allRecords.forEach((rec) => {
      const sId = rec.studentId.toString();
      if (studentAttendanceMap[sId] && (rec.status === 'PRESENT' || rec.status === 'OD')) {
        studentAttendanceMap[sId].attended += 1;
      }
    });

    let shortageStudentsCount = 0;
    const shortageStudents: any[] = [];

    studentsInDept.forEach((st) => {
      const stat = studentAttendanceMap[st._id.toString()];
      const percentage = stat && stat.total > 0 ? Math.round((stat.attended / stat.total) * 100) : 100;
      if (percentage < 75 && stat && stat.total > 0) {
        shortageStudentsCount++;
        shortageStudents.push({
          studentId: st._id,
          registerNo: st.registerNo,
          fullName: st.fullName,
          year: st.year,
          section: st.section,
          attended: stat.attended,
          total: stat.total,
          percentage,
        });
      }
    });

    // Subject-wise attendance summary
    const subjects = await Subject.find({ departmentId }).select('_id title code semester').lean();
    const subjectWiseSummary = subjects.map((sub) => {
      const subSessions = allSessions.filter((s) => String(s.subjectId) === String(sub._id));
      const subSessionIds = subSessions.map((s) => s._id);
      const subRecords = allRecords.filter((r) =>
        subSessionIds.some((id) => String(id) === String(r.sessionId))
      );
      const presentCount = subRecords.filter((r) => r.status === 'PRESENT' || r.status === 'OD').length;
      const totalCount = subRecords.length;
      const percentage = totalCount > 0 ? Math.round((presentCount / totalCount) * 100) : 0;

      return {
        subjectId: sub._id,
        title: sub.title,
        code: sub.code,
        semester: sub.semester,
        sessionsCount: subSessions.length,
        attendancePercentage: percentage,
      };
    });

    // Faculty attendance completion summary
    const facultyList = await Faculty.find({ departmentId }).select('_id fullName employeeId designation').lean();
    const facultyCompletionSummary = facultyList.map((fac) => {
      const facSessions = allSessions.filter((s) => String(s.facultyId) === String(fac._id));
      return {
        facultyId: fac._id,
        fullName: fac.fullName,
        employeeId: fac.employeeId,
        sessionsLogged: facSessions.length,
      };
    });

    // Recent department audit logs
    const recentAudit = await AuditLog.find({
      $or: [
        { 'details.departmentId': departmentId.toString() },
        { action: { $in: ['ATTENDANCE_RECORDED', 'ATTENDANCE_CORRECTION', 'SUBJECT_FACULTY_ASSIGNED', 'CLASS_INCHARGE_ASSIGNED'] } },
      ],
    })
      .populate('performedBy', 'identifier role')
      .sort({ timestamp: -1 })
      .limit(8)
      .lean();

    sendSuccess(
      res,
      {
        department: dept,
        stats: {
          totalStudents,
          totalFaculty,
          activeClassesCount: activeClasses.length,
          coursesCount: courses.length,
          todayScheduledPeriodsCount: todayScheduledPeriods.length,
          todayCompletedSessionsCount: todayCompletedSessions.length,
          pendingSessionsCount: pendingPeriodsCount,
          shortageStudentsCount,
        },
        todayTimetable: todayScheduledPeriods,
        classes: activeClasses,
        shortageStudents: shortageStudents.slice(0, 10),
        subjectWiseSummary,
        facultyCompletionSummary,
        recentAudit,
      },
      'HOD department dashboard retrieved successfully'
    );
  } catch (err: any) {
    sendError(res, err.message, 500);
  }
};

// Department Classes
export const getHODClasses = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const departmentId = await resolveHodDepartment(req);
    if (!departmentId) {
      sendError(res, 'No assigned department found', 404);
      return;
    }

    const classes = await CollegeClass.find({ departmentId, active: true })
      .populate('courseId', 'name code degree')
      .populate('batchId', 'name admissionYear graduationYear')
      .populate('classInCharge', 'fullName employeeId designation phone email')
      .populate('subjectAssignments.subjectId', 'title code credits')
      .populate('subjectAssignments.facultyId', 'fullName employeeId')
      .sort({ year: 1, section: 1 })
      .lean();

    const withStudentCounts = await Promise.all(
      classes.map(async (cls) => {
        const studentCount = await Student.countDocuments({
          $or: [
            { classId: cls._id },
            { courseId: cls.courseId?._id || cls.courseId, year: cls.year, section: cls.section },
          ],
        });
        return { ...cls, studentCount };
      })
    );

    sendSuccess(res, { classes: withStudentCounts }, 'Department classes retrieved');
  } catch (err: any) {
    sendError(res, err.message, 500);
  }
};

// Department Faculty
export const getHODFaculty = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const departmentId = await resolveHodDepartment(req);
    if (!departmentId) {
      sendError(res, 'No assigned department found', 404);
      return;
    }

    const faculty = await Faculty.find({ departmentId })
      .populate('assignedClasses.subjectId', 'title code')
      .populate('userId', 'status lastLogin')
      .sort({ fullName: 1 })
      .lean();

    sendSuccess(res, { faculty }, 'Department faculty roster retrieved');
  } catch (err: any) {
    sendError(res, err.message, 500);
  }
};

// Department Timetable
export const getHODTimetable = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const departmentId = await resolveHodDepartment(req);
    if (!departmentId) {
      sendError(res, 'No assigned department found', 404);
      return;
    }

    const { dayOfWeek, semester, section } = req.query;
    const filter: any = { departmentId };
    if (dayOfWeek) filter.dayOfWeek = dayOfWeek;
    if (semester) filter.semester = Number(semester);
    if (section) filter.section = (section as string).toUpperCase();

    const slots = await TimetableSlot.find(filter)
      .populate('subjectId', 'title code credits')
      .populate('facultyId', 'fullName employeeId designation')
      .sort({ dayOfWeek: 1, periodNo: 1 })
      .lean();

    sendSuccess(res, { slots }, 'Department timetable retrieved');
  } catch (err: any) {
    sendError(res, err.message, 500);
  }
};

// Timetable Assignment with Conflict Detection
const AssignTimetableSlotSchema = z.object({
  academicYear: z.string().min(4),
  semester: z.number().min(1).max(8),
  section: z.string().min(1),
  dayOfWeek: z.enum(['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY']),
  periodNo: z.number().min(1).max(8),
  startTime: z.string().min(4),
  endTime: z.string().min(4),
  subjectId: z.string().min(1),
  facultyId: z.string().min(1),
  roomNo: z.string().min(1),
});

export const assignTimetableSlot = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const departmentId = await resolveHodDepartment(req);
    if (!departmentId) {
      sendError(res, 'No assigned department found', 404);
      return;
    }

    const parsed = AssignTimetableSlotSchema.safeParse(req.body);
    if (!parsed.success) {
      sendError(res, parsed.error.errors[0].message, 422);
      return;
    }

    const data = parsed.data;

    // 1. Conflict Check: Is this faculty member already scheduled for another class at the same day & period?
    const conflictingFacultySlot = await TimetableSlot.findOne({
      academicYear: data.academicYear,
      dayOfWeek: data.dayOfWeek,
      periodNo: data.periodNo,
      facultyId: data.facultyId,
    })
      .populate('subjectId', 'title code')
      .populate('departmentId', 'name')
      .lean();

    if (conflictingFacultySlot) {
      sendError(
        res,
        `Faculty conflict: The selected faculty member is already scheduled to teach ${(conflictingFacultySlot.subjectId as any)?.title} for Semester ${conflictingFacultySlot.semester} (Sec ${conflictingFacultySlot.section}) on ${data.dayOfWeek} Period ${data.periodNo}.`,
        409
      );
      return;
    }

    // 2. Conflict Check: Is this class period already assigned to another subject/faculty?
    const existingClassSlot = await TimetableSlot.findOne({
      academicYear: data.academicYear,
      departmentId,
      semester: data.semester,
      section: data.section.toUpperCase(),
      dayOfWeek: data.dayOfWeek,
      periodNo: data.periodNo,
    });

    let slot;
    if (existingClassSlot) {
      // Update existing slot with new allocation
      existingClassSlot.subjectId = new mongoose.Types.ObjectId(data.subjectId);
      existingClassSlot.facultyId = new mongoose.Types.ObjectId(data.facultyId);
      existingClassSlot.startTime = data.startTime;
      existingClassSlot.endTime = data.endTime;
      existingClassSlot.roomNo = data.roomNo;
      slot = await existingClassSlot.save();
    } else {
      slot = await TimetableSlot.create({
        academicYear: data.academicYear,
        departmentId,
        semester: data.semester,
        section: data.section.toUpperCase(),
        dayOfWeek: data.dayOfWeek,
        periodNo: data.periodNo,
        startTime: data.startTime,
        endTime: data.endTime,
        subjectId: data.subjectId,
        facultyId: data.facultyId,
        roomNo: data.roomNo,
      });
    }

    await logAuditEvent(
      'TIMETABLE_SLOT_ASSIGNED',
      req.user!.userId,
      'TimetableSlot',
      slot._id.toString(),
      {
        dayOfWeek: data.dayOfWeek,
        periodNo: data.periodNo,
        facultyId: data.facultyId,
        subjectId: data.subjectId,
      },
      req.ip
    );

    sendSuccess(res, slot, 'Timetable assignment created with verified zero clashes', 201);
  } catch (err: any) {
    sendError(res, err.message, 500);
  }
};

// Department Shortages Report (< 75%)
export const getHODShortages = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const departmentId = await resolveHodDepartment(req);
    if (!departmentId) {
      sendError(res, 'No assigned department found', 404);
      return;
    }

    const { semester, section, threshold = '75' } = req.query;
    const filter: any = { departmentId };
    if (semester) filter.currentSemester = Number(semester);
    if (section) filter.section = (section as string).toUpperCase();

    const students = await Student.find(filter)
      .populate('courseId', 'name code')
      .sort({ year: 1, section: 1, registerNo: 1 })
      .lean();

    const sessions = await AttendanceSession.find({ departmentId }).lean();
    const sessionIds = sessions.map((s) => s._id);
    const records = await AttendanceRecord.find({ sessionId: { $in: sessionIds } }).lean();

    const studentMap: { [id: string]: { attended: number; total: number } } = {};
    students.forEach((st) => {
      // calculate total sessions for this student's semester & section
      const classSessions = sessions.filter(
        (s) => s.semester === st.currentSemester && s.section === st.section
      );
      studentMap[st._id.toString()] = { attended: 0, total: classSessions.length };
    });

    records.forEach((r) => {
      const sId = r.studentId.toString();
      if (studentMap[sId] && (r.status === 'PRESENT' || r.status === 'OD')) {
        studentMap[sId].attended += 1;
      }
    });

    const cutoff = Number(threshold);
    const shortageList = students
      .map((st) => {
        const stat = studentMap[st._id.toString()] || { attended: 0, total: 0 };
        const percentage = stat.total > 0 ? Math.round((stat.attended / stat.total) * 100) : 100;
        return {
          studentId: st._id,
          registerNo: st.registerNo,
          fullName: st.fullName,
          course: (st.courseId as any)?.name,
          year: st.year,
          semester: st.currentSemester,
          section: st.section,
          phone: st.phone,
          guardianPhone: st.guardianPhone,
          attendedClasses: stat.attended,
          totalClasses: stat.total,
          attendancePercentage: percentage,
          isShortage: percentage < cutoff,
        };
      })
      .filter((s) => s.isShortage && s.totalClasses > 0);

    sendSuccess(
      res,
      {
        threshold: cutoff,
        totalShortages: shortageList.length,
        students: shortageList,
      },
      'Attendance shortage report generated'
    );
  } catch (err: any) {
    sendError(res, err.message, 500);
  }
};
