import { Response } from 'express';
import { z } from 'zod';
import { CalendarEvent } from '../../models';
import { AuthenticatedRequest } from '../../types';
import { sendError, sendSuccess } from '../../utils/response';
import { logAuditEvent } from '../../middleware/audit';

const CreateEventSchema = z.object({
  title: z.string().min(3, 'Event title is required'),
  description: z.string().optional(),
  startDate: z.string(),
  endDate: z.string(),
  type: z.enum([
    'HOLIDAY',
    'EXAM',
    'SEMINAR',
    'CULTURAL',
    'MEETING',
    'DEADLINE',
    'EVENT',
    'ANNOUNCEMENT',
  ]),
  targetAudience: z.enum(['ALL', 'STUDENT', 'FACULTY']).default('ALL'),
  venue: z.string().optional(),
  targetCourseId: z.string().optional(),
  targetClassId: z.string().optional(),
  organizer: z.string().optional(),
  registrationDeadline: z.string().optional(),
  attachmentUrl: z.string().optional(),
  isPublished: z.boolean().default(true),
});

export const getEvents = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const { type, upcoming, targetAudience } = req.query;
    const filter: any = { isPublished: true, isDeleted: { $ne: true } };

    if (type) filter.type = type;
    if (targetAudience) filter.targetAudience = { $in: [targetAudience, 'ALL'] };

    if (upcoming === 'true') {
      filter.endDate = { $gte: new Date() };
    }

    const events = await CalendarEvent.find(filter)
      .populate('departmentId', 'name code')
      .populate('targetCourseId', 'name code')
      .populate('targetClassId', 'year section')
      .sort({ startDate: 1 })
      .lean();

    sendSuccess(res, { events }, 'College calendar events retrieved');
  } catch (err: any) {
    sendError(res, err.message, 500);
  }
};

export const createEvent = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  const parsed = CreateEventSchema.safeParse(req.body);
  if (!parsed.success) {
    sendError(res, parsed.error.errors[0].message, 422);
    return;
  }

  const data = parsed.data;
  const start = new Date(data.startDate);
  const end = new Date(data.endDate);

  if (end < start) {
    sendError(res, 'Event end date cannot be earlier than start date', 400);
    return;
  }

  const event = await CalendarEvent.create({
    title: data.title.trim(),
    description: data.description?.trim(),
    startDate: start,
    endDate: end,
    type: data.type,
    targetAudience: data.targetAudience,
    venue: data.venue?.trim(),
    targetCourseId: data.targetCourseId,
    targetClassId: data.targetClassId,
    organizer: data.organizer?.trim() || 'GASC Kuthalam',
    registrationDeadline: data.registrationDeadline ? new Date(data.registrationDeadline) : undefined,
    attachmentUrl: data.attachmentUrl,
    isPublished: data.isPublished,
    publishedBy: req.user!.userId,
  });

  await logAuditEvent(
    'EVENT_CREATED',
    req.user!.userId,
    'CalendarEvent',
    event._id.toString(),
    { title: event.title, type: event.type },
    req.ip
  );

  sendSuccess(res, event, 'Academic event / date published successfully', 201);
};

export const updateEvent = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    const event = await CalendarEvent.findByIdAndUpdate(id, req.body, { new: true });
    if (!event) {
      sendError(res, 'Event not found', 404);
      return;
    }

    await logAuditEvent(
      'EVENT_UPDATED',
      req.user!.userId,
      'CalendarEvent',
      event._id.toString(),
      { title: event.title },
      req.ip
    );

    sendSuccess(res, event, 'Event updated successfully');
  } catch (err: any) {
    sendError(res, err.message, 500);
  }
};

export const deleteEvent = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    const event = await CalendarEvent.findById(id);
    if (!event) {
      sendError(res, 'Event not found', 404);
      return;
    }

    event.isDeleted = true;
    event.deletedAt = new Date();
    event.deletedBy = req.user!.userId as any;
    event.deletionReason = req.body?.reason || 'Administrative archival';
    await event.save();

    await logAuditEvent(
      'EVENT_ARCHIVED',
      req.user!.userId,
      'CalendarEvent',
      id,
      { title: event.title, reason: event.deletionReason },
      req.ip
    );

    sendSuccess(res, null, 'Event removed from calendar (safely archived)');
  } catch (err: any) {
    sendError(res, err.message, 500);
  }
};

export const restoreEvent = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    const event = await CalendarEvent.findById(id);
    if (!event) {
      sendError(res, 'Event not found', 404);
      return;
    }

    event.isDeleted = false;
    event.deletedAt = undefined;
    event.deletedBy = undefined;
    event.deletionReason = undefined;
    await event.save();

    await logAuditEvent(
      'EVENT_RESTORED',
      req.user!.userId,
      'CalendarEvent',
      id,
      { title: event.title },
      req.ip
    );

    sendSuccess(res, event, 'Event restored successfully to calendar');
  } catch (err: any) {
    sendError(res, err.message, 500);
  }
};
