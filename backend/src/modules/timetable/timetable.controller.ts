import { Response } from 'express';
import { z } from 'zod';
import { TimetableSlot, CalendarEvent, Student, Faculty } from '../../models';
import { AuthenticatedRequest } from '../../types';
import { sendError, sendSuccess } from '../../utils/response';
import { logAuditEvent } from '../../middleware/audit';

const SlotSchema = z.object({
  academicYear: z.string().min(1),
  semester: z.number().min(1).max(8),
  departmentId: z.string().min(1),
  section: z.string().min(1),
  dayOfWeek: z.enum(['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY']),
  periodNo: z.number().min(1).max(8),
  startTime: z.string(),
  endTime: z.string(),
  subjectId: z.string().min(1),
  facultyId: z.string().min(1),
  roomNo: z.string().min(1),
});

const EventSchema = z.object({
  title: z.string().min(2),
  description: z.string().optional(),
  startDate: z.string(),
  endDate: z.string(),
  type: z.enum(['HOLIDAY', 'EXAM', 'SEMINAR', 'EVENT', 'DEADLINE']),
  targetAudience: z.enum(['ALL', 'STUDENT', 'FACULTY']).default('ALL'),
  departmentId: z.string().optional(),
});

// Get timetable for student's own class or selected query
export const getClassTimetable = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    let { departmentId, semester, section } = req.query;

    if (req.user!.role === 'STUDENT' && (!departmentId || !semester || !section)) {
      const student = await Student.findOne({ userId: req.user!.userId });
      if (student) {
        departmentId = student.departmentId.toString();
        semester = String(student.currentSemester);
        section = student.section;
      }
    }

    if (!departmentId || !semester || !section) {
      sendError(res, 'departmentId, semester, and section are required', 400);
      return;
    }

    const slots = await TimetableSlot.find({
      departmentId,
      semester: Number(semester),
      section: (section as string).toUpperCase(),
    })
      .populate('subjectId', 'title code credits')
      .populate('facultyId', 'fullName designation')
      .sort({ dayOfWeek: 1, periodNo: 1 })
      .lean();

    sendSuccess(res, { slots }, 'Weekly timetable retrieved');
  } catch (err: any) {
    sendError(res, err.message, 500);
  }
};

// Create or update slot with conflict prevention
export const saveTimetableSlot = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  const parsed = SlotSchema.safeParse(req.body);
  if (!parsed.success) {
    sendError(res, parsed.error.errors[0].message, 422);
    return;
  }

  const data = parsed.data;

  // Conflict check: ensure faculty is not booked for another class at the same day & period
  const facultyConflict = await TimetableSlot.findOne({
    academicYear: data.academicYear,
    dayOfWeek: data.dayOfWeek,
    periodNo: data.periodNo,
    facultyId: data.facultyId,
    $or: [
      { departmentId: { $ne: data.departmentId } },
      { semester: { $ne: data.semester } },
      { section: { $ne: data.section.toUpperCase() } },
    ],
  }).populate('facultyId', 'fullName');

  if (facultyConflict) {
    sendError(
      res,
      `Conflict: The faculty member is already assigned to another class on ${data.dayOfWeek} Period ${data.periodNo}!`,
      409
    );
    return;
  }

  const slot = await TimetableSlot.findOneAndUpdate(
    {
      academicYear: data.academicYear,
      departmentId: data.departmentId,
      semester: data.semester,
      section: data.section.toUpperCase(),
      dayOfWeek: data.dayOfWeek,
      periodNo: data.periodNo,
    },
    {
      ...data,
      section: data.section.toUpperCase(),
    },
    { upsert: true, new: true }
  );

  await logAuditEvent('TIMETABLE_SLOT_SAVED', req.user!.userId, 'TimetableSlot', slot._id.toString(), data, req.ip);
  sendSuccess(res, slot, 'Timetable slot configured successfully');
};

// Calendar events and exam schedules
export const getCalendarEvents = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const { type } = req.query;
    const filter: any = {};
    if (type) filter.type = type;

    const events = await CalendarEvent.find(filter)
      .sort({ startDate: 1 })
      .lean();

    sendSuccess(res, { events }, 'Calendar events retrieved');
  } catch (err: any) {
    sendError(res, err.message, 500);
  }
};

export const createCalendarEvent = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  const parsed = EventSchema.safeParse(req.body);
  if (!parsed.success) {
    sendError(res, parsed.error.errors[0].message, 422);
    return;
  }

  const event = await CalendarEvent.create({
    ...parsed.data,
    startDate: new Date(parsed.data.startDate),
    endDate: new Date(parsed.data.endDate),
  });

  await logAuditEvent('CALENDAR_EVENT_CREATED', req.user!.userId, 'CalendarEvent', event._id.toString(), {}, req.ip);
  sendSuccess(res, event, 'Academic event created', 201);
};
