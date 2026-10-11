import { Response } from 'express';
import { z } from 'zod';
import {
  Faculty,
  AttendanceSession,
  Assessment,
  TimetableSlot,
  Assignment,
  Student,
  FacultyLeave,
} from '../../models';
import { AuthenticatedRequest } from '../../types';
import { sendError, sendSuccess } from '../../utils/response';
import { logAuditEvent } from '../../middleware/audit';

const LeaveRequestSchema = z.object({
  leaveType: z.enum(['CASUAL', 'MEDICAL', 'EARNED', 'SPECIAL']),
  startDate: z.string(),
  endDate: z.string(),
  reason: z.string().min(5),
});

export const getFacultyDashboard = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const faculty = await Faculty.findOne({ userId: req.user!.userId })
      .populate('departmentId', 'name code')
      .populate('assignedClasses.departmentId', 'name code')
      .populate('assignedClasses.subjectId', 'title code credits')
      .lean();

    if (!faculty) {
      sendError(res, 'Faculty profile not found', 404);
      return;
    }

    // Today's timetable for this faculty
    const days = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'] as const;
    const currentDay = days[new Date().getDay()];
    let todayClasses: any[] = [];

    if (currentDay !== 'SUNDAY') {
      todayClasses = await TimetableSlot.find({
        facultyId: faculty._id,
        dayOfWeek: currentDay,
      })
        .populate('subjectId', 'title code')
        .populate('departmentId', 'name code')
        .sort({ periodNo: 1 })
        .lean();
    }

    // Recent assessments created by this faculty
    const assessments = await Assessment.find({ facultyId: faculty._id })
      .populate('subjectId', 'title code')
      .sort({ createdAt: -1 })
      .limit(5)
      .lean();

    // Assignments
    const assignments = await Assignment.find({ facultyId: faculty._id })
      .populate('subjectId', 'title code')
      .sort({ createdAt: -1 })
      .limit(5)
      .lean();

    // Recent attendance sessions taken
    const recentSessions = await AttendanceSession.find({ facultyId: faculty._id })
      .populate('subjectId', 'title code')
      .populate('departmentId', 'code')
      .sort({ date: -1, period: -1 })
      .limit(5)
      .lean();

    // Pending leave requests count
    const pendingLeaves = await FacultyLeave.countDocuments({
      facultyId: faculty._id,
      status: 'PENDING',
    });

    sendSuccess(
      res,
      {
        faculty,
        todayClasses,
        recentSessions,
        assessments,
        assignments,
        pendingLeaves,
      },
      'Faculty dashboard retrieved successfully'
    );
  } catch (err: any) {
    sendError(res, err.message, 500);
  }
};

export const submitLeaveRequest = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  const parsed = LeaveRequestSchema.safeParse(req.body);
  if (!parsed.success) {
    sendError(res, parsed.error.errors[0].message, 422);
    return;
  }

  const faculty = await Faculty.findOne({ userId: req.user!.userId });
  if (!faculty) {
    sendError(res, 'Faculty profile not found', 404);
    return;
  }

  const leave = await FacultyLeave.create({
    facultyId: faculty._id,
    leaveType: parsed.data.leaveType,
    startDate: new Date(parsed.data.startDate),
    endDate: new Date(parsed.data.endDate),
    reason: parsed.data.reason,
    status: 'PENDING',
  });

  await logAuditEvent(
    'LEAVE_REQUESTED',
    req.user!.userId,
    'FacultyLeave',
    leave._id.toString(),
    { leaveType: parsed.data.leaveType },
    req.ip
  );

  sendSuccess(res, leave, 'Staff leave request submitted successfully', 201);
};

export const getMyLeaveRequests = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const faculty = await Faculty.findOne({ userId: req.user!.userId });
    if (!faculty) {
      sendError(res, 'Faculty profile not found', 404);
      return;
    }

    const leaves = await FacultyLeave.find({ facultyId: faculty._id })
      .sort({ createdAt: -1 })
      .lean();

    sendSuccess(res, { leaves }, 'Faculty leave requests retrieved');
  } catch (err: any) {
    sendError(res, err.message, 500);
  }
};
