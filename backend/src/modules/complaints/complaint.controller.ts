import { Response } from 'express';
import { z } from 'zod';
import { StudentComplaint, Student, Faculty } from '../../models';
import { AuthenticatedRequest } from '../../types';
import { sendError, sendSuccess } from '../../utils/response';
import { logAuditEvent } from '../../middleware/audit';

const CreateComplaintSchema = z.object({
  category: z.enum([
    'ACADEMIC',
    'INFRASTRUCTURE',
    'HOSTEL_CANTEEN',
    'HARASSMENT_RAGGING',
    'EXAMINATION',
    'LIBRARY',
    'GENERAL',
  ]),
  subject: z.string().min(5, 'Subject must be at least 5 characters'),
  description: z.string().min(10, 'Description must be at least 10 characters'),
  evidenceUrl: z.string().optional(),
});

export const createComplaint = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  const parsed = CreateComplaintSchema.safeParse(req.body);
  if (!parsed.success) {
    sendError(res, parsed.error.errors[0].message, 422);
    return;
  }

  const student = await Student.findOne({ userId: req.user!.userId });
  if (!student) {
    sendError(res, 'Student profile not found', 404);
    return;
  }

  const count = await StudentComplaint.countDocuments();
  const year = new Date().getFullYear();
  const ticketNumber = `CMP-${year}-${String(count + 1).padStart(4, '0')}`;

  const complaint = await StudentComplaint.create({
    ticketNumber,
    studentId: student._id,
    category: parsed.data.category,
    subject: parsed.data.subject.trim(),
    description: parsed.data.description.trim(),
    evidenceUrl: parsed.data.evidenceUrl,
    status: 'SUBMITTED',
    priority: parsed.data.category === 'HARASSMENT_RAGGING' ? 'URGENT' : 'MEDIUM',
    history: [
      {
        status: 'SUBMITTED',
        changedBy: req.user!.userId as any,
        comment: 'Grievance submitted by student',
        timestamp: new Date(),
      },
    ],
  });

  await logAuditEvent(
    'COMPLAINT_SUBMITTED',
    req.user!.userId,
    'StudentComplaint',
    complaint._id.toString(),
    { ticketNumber, category: parsed.data.category },
    req.ip
  );

  sendSuccess(
    res,
    complaint,
    `Grievance submitted successfully. Your tracking ticket number is ${ticketNumber}.`,
    201
  );
};

export const getMyComplaints = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const student = await Student.findOne({ userId: req.user!.userId });
    if (!student) {
      sendError(res, 'Student profile not found', 404);
      return;
    }

    // Student view: Exclude confidential internalNotes
    const complaints = await StudentComplaint.find({ studentId: student._id })
      .select('-internalNotes')
      .populate('assignedTo', 'fullName designation')
      .sort({ createdAt: -1 })
      .lean();

    sendSuccess(res, { complaints }, 'Grievance complaints retrieved');
  } catch (err: any) {
    sendError(res, err.message, 500);
  }
};

export const getAllComplaints = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const { status, category, priority } = req.query;
    const filter: any = {};
    if (status) filter.status = status;
    if (category) filter.category = category;
    if (priority) filter.priority = priority;

    const complaints = await StudentComplaint.find(filter)
      .populate({
        path: 'studentId',
        select: 'fullName registerNo email phone currentSemester year',
        populate: [
          { path: 'courseId', select: 'name code' },
          { path: 'departmentId', select: 'name code' },
        ],
      })
      .populate('assignedTo', 'fullName employeeId designation')
      .sort({ createdAt: -1 })
      .lean();

    sendSuccess(res, { complaints }, 'All student complaints retrieved for administrative review');
  } catch (err: any) {
    sendError(res, err.message, 500);
  }
};

const UpdateComplaintSchema = z.object({
  status: z
    .enum(['SUBMITTED', 'UNDER_REVIEW', 'ASSIGNED', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'])
    .optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).optional(),
  assignedTo: z.string().optional(),
  officialResponse: z.string().optional(),
  internalNotes: z.string().optional(),
});

export const updateComplaintStatus = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    const parsed = UpdateComplaintSchema.safeParse(req.body);
    if (!parsed.success) {
      sendError(res, parsed.error.errors[0].message, 422);
      return;
    }

    const complaint = await StudentComplaint.findById(id);
    if (!complaint) {
      sendError(res, 'Complaint not found', 404);
      return;
    }

    const { status, priority, assignedTo, officialResponse, internalNotes } = parsed.data;

    if (priority) complaint.priority = priority;
    if (assignedTo) complaint.assignedTo = assignedTo as any;
    if (officialResponse !== undefined) complaint.officialResponse = officialResponse;
    if (internalNotes !== undefined) complaint.internalNotes = internalNotes;

    if (status && status !== complaint.status) {
      complaint.status = status;
      if (status === 'RESOLVED' || status === 'CLOSED') {
        complaint.resolvedAt = new Date();
      }
      complaint.history.push({
        status,
        changedBy: req.user!.userId as any,
        comment: officialResponse || internalNotes || `Status updated to ${status}`,
        timestamp: new Date(),
      });
    }

    await complaint.save();

    await logAuditEvent(
      'COMPLAINT_UPDATED',
      req.user!.userId,
      'StudentComplaint',
      complaint._id.toString(),
      { ticketNumber: complaint.ticketNumber, status: complaint.status },
      req.ip
    );

    sendSuccess(res, complaint, `Complaint ${complaint.ticketNumber} updated successfully`);
  } catch (err: any) {
    sendError(res, err.message, 500);
  }
};
