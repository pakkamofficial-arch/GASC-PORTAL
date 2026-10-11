import { Response } from 'express';
import { z } from 'zod';
import { Assignment, Submission, Student, Faculty } from '../../models';
import { AuthenticatedRequest } from '../../types';
import { sendError, sendSuccess } from '../../utils/response';
import { logAuditEvent } from '../../middleware/audit';

const CreateAssignmentSchema = z.object({
  title: z.string().min(3),
  description: z.string().min(5),
  subjectId: z.string().min(1),
  departmentId: z.string().min(1),
  semester: z.number().min(1).max(8),
  section: z.string().min(1),
  dueDate: z.string(),
  maxMarks: z.number().positive().default(10),
  attachmentUrl: z.string().optional(),
});

const SubmitAssignmentSchema = z.object({
  textContent: z.string().optional(),
  fileUrl: z.string().optional(),
});

const GradeSubmissionSchema = z.object({
  marksAwarded: z.number().min(0),
  feedback: z.string().optional(),
});

export const createAssignment = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  const parsed = CreateAssignmentSchema.safeParse(req.body);
  if (!parsed.success) {
    sendError(res, parsed.error.errors[0].message, 422);
    return;
  }

  const faculty = await Faculty.findOne({ userId: req.user!.userId });
  if (!faculty) {
    sendError(res, 'Faculty profile not found', 403);
    return;
  }

  const assignment = await Assignment.create({
    ...parsed.data,
    facultyId: faculty._id,
    dueDate: new Date(parsed.data.dueDate),
  });

  await logAuditEvent('ASSIGNMENT_CREATED', req.user!.userId, 'Assignment', assignment._id.toString(), {}, req.ip);
  sendSuccess(res, assignment, 'Assignment created successfully', 201);
};

export const getAssignments = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const filter: any = {};

    if (req.user!.role === 'STUDENT') {
      const student = await Student.findOne({ userId: req.user!.userId });
      if (student) {
        filter.departmentId = student.departmentId;
        filter.semester = student.currentSemester;
        filter.section = student.section;
      }
    } else if (req.user!.role === 'FACULTY') {
      const faculty = await Faculty.findOne({ userId: req.user!.userId });
      if (faculty) filter.facultyId = faculty._id;
    }

    const assignments = await Assignment.find(filter)
      .populate('subjectId', 'title code')
      .populate('facultyId', 'fullName')
      .sort({ dueDate: -1 })
      .lean();

    sendSuccess(res, { assignments }, 'Assignments retrieved');
  } catch (err: any) {
    sendError(res, err.message, 500);
  }
};

export const submitAssignment = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  const { id } = req.params;
  const parsed = SubmitAssignmentSchema.safeParse(req.body);
  if (!parsed.success) {
    sendError(res, parsed.error.errors[0].message, 422);
    return;
  }

  const student = await Student.findOne({ userId: req.user!.userId });
  if (!student) {
    sendError(res, 'Student profile not found', 404);
    return;
  }

  const assignment = await Assignment.findById(id);
  if (!assignment) {
    sendError(res, 'Assignment not found', 404);
    return;
  }

  const isLate = new Date() > assignment.dueDate;

  const submission = await Submission.findOneAndUpdate(
    { assignmentId: id, studentId: student._id },
    {
      assignmentId: id,
      studentId: student._id,
      textContent: parsed.data.textContent,
      fileUrl: parsed.data.fileUrl,
      submissionDate: new Date(),
      status: isLate ? 'LATE' : 'SUBMITTED',
    },
    { upsert: true, new: true }
  );

  sendSuccess(res, submission, 'Assignment submission uploaded successfully');
};

export const gradeSubmission = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  const { submissionId } = req.params;
  const parsed = GradeSubmissionSchema.safeParse(req.body);
  if (!parsed.success) {
    sendError(res, parsed.error.errors[0].message, 422);
    return;
  }

  const submission = await Submission.findById(submissionId).populate('assignmentId');
  if (!submission) {
    sendError(res, 'Submission not found', 404);
    return;
  }

  const assignment = submission.assignmentId as any;
  if (parsed.data.marksAwarded > assignment.maxMarks) {
    sendError(res, `Marks awarded cannot exceed maximum marks (${assignment.maxMarks})`, 400);
    return;
  }

  submission.marksAwarded = parsed.data.marksAwarded;
  submission.feedback = parsed.data.feedback;
  submission.status = 'EVALUATED';
  await submission.save();

  sendSuccess(res, submission, 'Submission evaluated successfully');
};

export const getAssignmentSubmissions = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  const { id } = req.params;
  const submissions = await Submission.find({ assignmentId: id })
    .populate('studentId', 'fullName registerNumber rollNumber email')
    .sort({ submissionDate: -1 });

  sendSuccess(res, { submissions }, 'Submissions retrieved successfully');
};

