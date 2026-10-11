import { Response } from 'express';
import mongoose from 'mongoose';
import {
  Student,
  AttendanceSession,
  AttendanceRecord,
  Assessment,
  Mark,
  TimetableSlot,
  Assignment,
  Announcement,
  StudentFeeAccount,
  StudentIDCard,
  BonafideRequest,
  Subject,
} from '../../models';
import { AuthenticatedRequest } from '../../types';
import { sendError, sendSuccess } from '../../utils/response';

// Get current logged-in student dashboard bundle
export const getStudentDashboard = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const student = await Student.findOne({ userId: req.user!.userId })
      .populate('departmentId', 'name code')
      .populate('courseId', 'name code degree')
      .lean();

    if (!student) {
      sendError(res, 'Student profile not found', 404);
      return;
    }

    const studentId = student._id;
    const departmentId = (student.departmentId as any)._id;
    const semester = student.currentSemester;
    const section = student.section;

    // 1. Attendance calculations
    // Find all attendance sessions for student's class
    const sessions = await AttendanceSession.find({
      departmentId,
      semester,
      section,
    }).select('_id subjectId').lean();

    const sessionIds = sessions.map((s) => s._id);
    const records = await AttendanceRecord.find({
      sessionId: { $in: sessionIds },
      studentId,
    }).lean();

    const recordMap = new Map<string, string>();
    records.forEach((r) => recordMap.set(r.sessionId.toString(), r.status));

    let totalClassesHeld = sessions.length;
    let attendedClasses = 0;

    // Map subject-wise
    const subjectAttendanceMap: {
      [subjectId: string]: { total: number; attended: number; percentage: number };
    } = {};

    sessions.forEach((s) => {
      const subIdStr = s.subjectId.toString();
      if (!subjectAttendanceMap[subIdStr]) {
        subjectAttendanceMap[subIdStr] = { total: 0, attended: 0, percentage: 0 };
      }
      subjectAttendanceMap[subIdStr].total += 1;

      const status = recordMap.get(s._id.toString());
      if (status === 'PRESENT' || status === 'OD') {
        attendedClasses += 1;
        subjectAttendanceMap[subIdStr].attended += 1;
      }
    });

    // Populate subject names for subject-wise attendance
    const subjects = await Subject.find({
      departmentId,
      semester,
    }).lean();

    const subjectWiseAttendance = subjects.map((sub) => {
      const stats = subjectAttendanceMap[sub._id.toString()] || { total: 0, attended: 0 };
      const percentage = stats.total > 0 ? Math.round((stats.attended / stats.total) * 100) : 100;
      return {
        subjectId: sub._id,
        subjectCode: sub.code,
        subjectTitle: sub.title,
        attended: stats.attended,
        total: stats.total,
        percentage,
        isLowAttendance: percentage < 75,
      };
    });

    const overallAttendancePercentage =
      totalClassesHeld > 0 ? Math.round((attendedClasses / totalClassesHeld) * 100) : 100;

    // 2. Today's Timetable
    const days = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'] as const;
    const currentDay = days[new Date().getDay()];
    let todayTimetable: any[] = [];

    if (currentDay !== 'SUNDAY') {
      todayTimetable = await TimetableSlot.find({
        departmentId,
        semester,
        section,
        dayOfWeek: currentDay,
      })
        .populate('subjectId', 'title code')
        .populate('facultyId', 'fullName designation')
        .sort({ periodNo: 1 })
        .lean();
    }

    // 3. Recently published marks
    const publishedAssessments = await Assessment.find({
      departmentId,
      semester,
      status: 'PUBLISHED',
    })
      .populate('subjectId', 'title code')
      .sort({ publishedAt: -1 })
      .limit(5)
      .lean();

    const assessmentIds = publishedAssessments.map((a) => a._id);
    const marks = await Mark.find({
      assessmentId: { $in: assessmentIds },
      studentId,
    }).lean();

    const marksMap = new Map<string, any>();
    marks.forEach((m) => marksMap.set(m.assessmentId.toString(), m));

    const recentMarks = publishedAssessments.map((a) => {
      const m = marksMap.get(a._id.toString());
      return {
        assessmentId: a._id,
        assessmentTitle: a.title,
        category: a.category,
        subjectTitle: (a.subjectId as any)?.title || 'Subject',
        subjectCode: (a.subjectId as any)?.code || '',
        maxMarks: a.maxMarks,
        marksObtained: m ? m.marksObtained : 'N/A',
        isAbsent: m ? m.isAbsent : false,
        grade: m?.grade || '',
      };
    });

    // 4. Upcoming assignments & deadlines
    const upcomingAssignments = await Assignment.find({
      departmentId,
      semester,
      section,
      dueDate: { $gte: new Date() },
    })
      .populate('subjectId', 'title code')
      .sort({ dueDate: 1 })
      .limit(5)
      .lean();

    // 5. Announcements / Notices
    const announcements = await Announcement.find({
      targetRole: { $in: ['ALL', 'STUDENT'] },
      $or: [{ departmentId: null }, { departmentId }],
    })
      .sort({ publishedAt: -1 })
      .limit(5)
      .lean();

    // 6. Fee summary
    const feeAccount = await StudentFeeAccount.findOne({
      studentId,
      semester,
    }).lean();

    // 7. Quick status for ID card & Bonafide
    const idCard = await StudentIDCard.findOne({ studentId }).lean();
    const activeBonafide = await BonafideRequest.findOne({ studentId })
      .sort({ createdAt: -1 })
      .lean();

    sendSuccess(res, {
      student,
      attendance: {
        overallPercentage: overallAttendancePercentage,
        totalClassesHeld,
        attendedClasses,
        subjectWise: subjectWiseAttendance,
        lowAttendanceWarning: overallAttendancePercentage < 75,
      },
      todayTimetable,
      recentMarks,
      upcomingAssignments,
      announcements,
      fee: feeAccount
        ? {
            total: feeAccount.baseAmount,
            concession: feeAccount.concessionAmount,
            netPayable: feeAccount.netPayable,
            paid: feeAccount.paidAmount,
            balance: feeAccount.balanceAmount,
            status: feeAccount.status,
          }
        : null,
      idCardStatus: idCard?.status || 'NOT_REQUESTED',
      latestBonafideStatus: activeBonafide?.status || null,
    });
  } catch (err: any) {
    sendError(res, err.message, 500);
  }
};

// Get detailed attendance history for the logged-in student
export const getMyAttendance = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const student = await Student.findOne({ userId: req.user!.userId });
    if (!student) {
      sendError(res, 'Student profile not found', 404);
      return;
    }

    const sessions = await AttendanceSession.find({
      departmentId: student.departmentId,
      semester: student.currentSemester,
      section: student.section,
    })
      .populate('subjectId', 'title code')
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

    const history = sessions.map((s) => {
      const rec = recordMap.get(s._id.toString());
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

    sendSuccess(res, { history }, 'Attendance history retrieved');
  } catch (err: any) {
    sendError(res, err.message, 500);
  }
};

// Get published marks for the student
export const getMyMarks = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const student = await Student.findOne({ userId: req.user!.userId });
    if (!student) {
      sendError(res, 'Student not found', 404);
      return;
    }

    const assessments = await Assessment.find({
      departmentId: student.departmentId,
      semester: student.currentSemester,
      status: 'PUBLISHED',
    })
      .populate('subjectId', 'title code credits')
      .sort({ assessmentDate: -1 })
      .lean();

    const marks = await Mark.find({
      assessmentId: { $in: assessments.map((a) => a._id) },
      studentId: student._id,
    }).lean();

    const marksMap = new Map<string, any>();
    marks.forEach((m) => marksMap.set(m.assessmentId.toString(), m));

    const results = assessments.map((a) => {
      const m = marksMap.get(a._id.toString());
      return {
        assessmentId: a._id,
        title: a.title,
        category: a.category,
        subject: a.subjectId,
        maxMarks: a.maxMarks,
        passingMarks: a.passingMarks,
        marksObtained: m ? m.marksObtained : null,
        isAbsent: m ? m.isAbsent : false,
        grade: m?.grade || '',
        passed: m ? !m.isAbsent && m.marksObtained >= a.passingMarks : false,
      };
    });

    sendSuccess(res, { results }, 'Published marks retrieved');
  } catch (err: any) {
    sendError(res, err.message, 500);
  }
};
