import { Response } from 'express';
import mongoose from 'mongoose';
import { z } from 'zod';
import { Assessment, Mark, Student, Faculty, Subject } from '../../models';
import { AuthenticatedRequest } from '../../types';
import { sendError, sendSuccess } from '../../utils/response';
import { logAuditEvent } from '../../middleware/audit';

const CreateAssessmentSchema = z.object({
  title: z.string().min(3),
  category: z.enum(['INTERNAL_TEST', 'ASSIGNMENT', 'SEMINAR', 'PRACTICAL', 'EXTERNAL_EXAM']),
  academicYear: z.string().min(1),
  semester: z.number().min(1).max(8),
  departmentId: z.string().min(1),
  subjectId: z.string().min(1),
  maxMarks: z.number().min(1),
  passingMarks: z.number().min(0),
  assessmentDate: z.string(),
  entryDeadline: z.string(),
  remarks: z.string().optional(),
});

const SaveMarksSchema = z.object({
  marks: z.array(
    z.object({
      studentId: z.string(),
      marksObtained: z.number().min(0, 'Marks cannot be negative'),
      isAbsent: z.boolean().default(false),
      remarks: z.string().optional(),
    })
  ),
  submitForApproval: z.boolean().default(false),
});

// Configure a new assessment
export const createAssessment = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  const parsed = CreateAssessmentSchema.safeParse(req.body);
  if (!parsed.success) {
    sendError(res, parsed.error.errors[0].message, 422);
    return;
  }

  const data = parsed.data;

  let facultyId: mongoose.Types.ObjectId;
  if (req.user!.role === 'FACULTY') {
    const faculty = await Faculty.findOne({ userId: req.user!.userId });
    if (!faculty) {
      sendError(res, 'Faculty profile not found', 403);
      return;
    }
    facultyId = faculty._id as mongoose.Types.ObjectId;
  } else {
    const faculty = await Faculty.findOne({ departmentId: data.departmentId });
    facultyId = (faculty?._id as mongoose.Types.ObjectId) || new mongoose.Types.ObjectId();
  }

  const assessment = await Assessment.create({
    ...data,
    facultyId,
    assessmentDate: new Date(data.assessmentDate),
    entryDeadline: new Date(data.entryDeadline),
    status: 'DRAFT',
  });

  await logAuditEvent(
    'ASSESSMENT_CREATED',
    req.user!.userId,
    'Assessment',
    assessment._id.toString(),
    { title: data.title, category: data.category, maxMarks: data.maxMarks },
    req.ip
  );

  sendSuccess(res, assessment, 'Assessment configured successfully', 201);
};

// List assessments with filters
export const getAssessments = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const { departmentId, semester, subjectId, status } = req.query;
    const filter: any = {};

    if (departmentId) filter.departmentId = departmentId;
    if (semester) filter.semester = Number(semester);
    if (subjectId) filter.subjectId = subjectId;
    if (status) filter.status = status;

    if (req.user!.role === 'FACULTY') {
      const faculty = await Faculty.findOne({ userId: req.user!.userId });
      if (faculty) filter.facultyId = faculty._id;
    }

    const assessments = await Assessment.find(filter)
      .populate('departmentId', 'name code')
      .populate('subjectId', 'title code maxInternalMarks maxExternalMarks')
      .populate('facultyId', 'fullName')
      .sort({ createdAt: -1 })
      .lean();

    sendSuccess(res, { assessments }, 'Assessments retrieved');
  } catch (err: any) {
    sendError(res, err.message, 500);
  }
};

// Get single assessment details and enrolled students with marks (or draft)
export const getAssessmentDetails = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    const assessment = await Assessment.findById(id)
      .populate('departmentId', 'name code')
      .populate('subjectId', 'title code')
      .populate('facultyId', 'fullName')
      .lean();

    if (!assessment) {
      sendError(res, 'Assessment not found', 404);
      return;
    }

    // Get all enrolled students for this department & semester
    const students = await Student.find({
      departmentId: assessment.departmentId,
      currentSemester: assessment.semester,
    })
      .select('_id registerNo fullName section photoUrl')
      .sort({ registerNo: 1 })
      .lean();

    // Get existing marks entered
    const existingMarks = await Mark.find({ assessmentId: id }).lean();
    const marksMap = new Map<string, any>();
    existingMarks.forEach((m) => marksMap.set(m.studentId.toString(), m));

    const studentMarksList = students.map((st) => {
      const entered = marksMap.get(st._id.toString());
      return {
        studentId: st._id,
        registerNo: st.registerNo,
        fullName: st.fullName,
        section: st.section,
        marksObtained: entered ? entered.marksObtained : null,
        isAbsent: entered ? entered.isAbsent : false,
        grade: entered?.grade || null,
        remarks: entered?.remarks || '',
      };
    });

    sendSuccess(res, { assessment, students: studentMarksList }, 'Assessment details retrieved');
  } catch (err: any) {
    sendError(res, err.message, 500);
  }
};

// Save draft marks or submit for review
export const saveMarks = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  const { id } = req.params;
  const parsed = SaveMarksSchema.safeParse(req.body);
  if (!parsed.success) {
    sendError(res, parsed.error.errors[0].message, 422);
    return;
  }

  const assessment = await Assessment.findById(id);
  if (!assessment) {
    sendError(res, 'Assessment not found', 404);
    return;
  }

  if (assessment.status === 'PUBLISHED') {
    sendError(res, 'Cannot edit marks for an assessment that is already PUBLISHED', 400);
    return;
  }

  const { marks, submitForApproval } = parsed.data;

  // Validate that no mark exceeds maxMarks and no mark is negative
  for (const entry of marks) {
    if (!entry.isAbsent && entry.marksObtained > assessment.maxMarks) {
      sendError(
        res,
        `Mark for student cannot exceed maximum marks (${assessment.maxMarks}). Received: ${entry.marksObtained}`,
        422
      );
      return;
    }
  }

  // Calculate grade based on university standards
  const calculateGrade = (obtained: number, max: number, isAbsent: boolean): string => {
    if (isAbsent) return 'AB';
    const percent = (obtained / max) * 100;
    if (percent >= 90) return 'O';
    if (percent >= 80) return 'A+';
    if (percent >= 70) return 'A';
    if (percent >= 60) return 'B+';
    if (percent >= 50) return 'B';
    if (percent >= 40) return 'C';
    return 'RA'; // Re-appear / Fail
  };

  // Upsert marks
  for (const entry of marks) {
    const grade = calculateGrade(entry.marksObtained, assessment.maxMarks, entry.isAbsent);
    await Mark.findOneAndUpdate(
      { assessmentId: id, studentId: entry.studentId },
      {
        subjectId: assessment.subjectId,
        marksObtained: entry.marksObtained,
        isAbsent: entry.isAbsent,
        grade,
        remarks: entry.remarks,
        enteredBy: req.user!.userId,
        lastUpdatedBy: req.user!.userId,
      },
      { upsert: true, new: true }
    );
  }

  if (submitForApproval) {
    assessment.status = 'SUBMITTED';
    await assessment.save();
  }

  await logAuditEvent(
    submitForApproval ? 'MARKS_SUBMITTED' : 'MARKS_SAVED_DRAFT',
    req.user!.userId,
    'Assessment',
    assessment._id.toString(),
    { totalEntered: marks.length, submitted: submitForApproval },
    req.ip
  );

  sendSuccess(
    res,
    { status: assessment.status },
    submitForApproval ? 'Marks submitted for administrative approval' : 'Marks draft saved successfully'
  );
};

// Admin approves marks
export const approveMarks = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  const { id } = req.params;
  const assessment = await Assessment.findById(id);
  if (!assessment) {
    sendError(res, 'Assessment not found', 404);
    return;
  }

  assessment.status = 'APPROVED';
  assessment.approvedBy = new mongoose.Types.ObjectId(req.user!.userId);
  assessment.approvedAt = new Date();
  await assessment.save();

  await logAuditEvent('MARKS_APPROVED', req.user!.userId, 'Assessment', assessment._id.toString(), {}, req.ip);
  sendSuccess(res, assessment, 'Marks approved successfully');
};

// Admin publishes marks (now visible to students)
export const publishMarks = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  const { id } = req.params;
  const assessment = await Assessment.findById(id);
  if (!assessment) {
    sendError(res, 'Assessment not found', 404);
    return;
  }

  if (assessment.status !== 'APPROVED') {
    sendError(res, 'Only APPROVED assessments can be published to students', 400);
    return;
  }

  assessment.status = 'PUBLISHED';
  assessment.publishedAt = new Date();
  await assessment.save();

  await logAuditEvent('MARKS_PUBLISHED', req.user!.userId, 'Assessment', assessment._id.toString(), {}, req.ip);
  sendSuccess(res, assessment, 'Marks published to students');
};
