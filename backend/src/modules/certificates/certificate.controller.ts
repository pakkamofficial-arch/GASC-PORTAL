import { Response } from 'express';
import mongoose from 'mongoose';
import { z } from 'zod';
import { BonafideRequest, Student } from '../../models';
import { AuthenticatedRequest } from '../../types';
import { sendError, sendSuccess } from '../../utils/response';
import { generateBonafidePDFBuffer } from './pdf.service';
import { generateBonafideDocxBuffer } from './bonafide.service';
import { logAuditEvent } from '../../middleware/audit';

const CreateBonafideSchema = z.object({
  purpose: z.enum([
    'SCHOLARSHIP',
    'BUS_PASS',
    'TRAIN_PASS',
    'PASSPORT',
    'BANK_ACCOUNT',
    'EDUCATION_LOAN',
    'INTERNSHIP',
    'GENERAL',
  ]),
  additionalDetails: z.string().optional(),
});

// Pre-fill verified student data for Bonafide certificate form
export const getCertificatePrefill = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const student = await Student.findOne({ userId: req.user!.userId })
      .populate('departmentId', 'name code')
      .populate('courseId', 'name code degree')
      .populate('classId', 'year section')
      .lean();

    if (!student) {
      sendError(res, 'Student profile not found', 404);
      return;
    }

    sendSuccess(
      res,
      {
        studentId: student._id,
        fullName: student.fullName,
        registerNo: student.registerNo,
        courseName: (student.courseId as any)?.name || 'Degree Course',
        departmentName: (student.departmentId as any)?.name || 'Department',
        year: student.year || 1,
        currentSemester: student.currentSemester,
        section: student.section,
        academicYear: student.academicYear,
        admissionDate: student.admissionDate,
      },
      'Verified pre-fill information retrieved'
    );
  } catch (err: any) {
    sendError(res, err.message, 500);
  }
};

// Student creates or submits bonafide request
export const createBonafideRequest = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  const parsed = CreateBonafideSchema.safeParse(req.body);
  if (!parsed.success) {
    sendError(res, parsed.error.errors[0].message, 422);
    return;
  }

  const student = await Student.findOne({ userId: req.user!.userId });
  if (!student) {
    sendError(res, 'Student profile not found', 404);
    return;
  }

  // Check if active request for same purpose exists
  const existingPending = await BonafideRequest.findOne({
    studentId: student._id,
    purpose: parsed.data.purpose,
    status: { $in: ['DRAFT', 'SUBMITTED', 'UNDER_REVIEW', 'CORRECTION_REQUIRED'] },
  });

  if (existingPending) {
    sendError(res, 'You already have an active application in review for this purpose.', 400);
    return;
  }

  const bonafide = await BonafideRequest.create({
    studentId: student._id,
    purpose: parsed.data.purpose,
    additionalDetails: parsed.data.additionalDetails,
    academicYear: student.academicYear,
    status: 'SUBMITTED',
    history: [
      {
        status: 'SUBMITTED',
        changedBy: req.user!.userId as any,
        reason: 'Application submitted by student with verified records',
        timestamp: new Date(),
      },
    ],
  });

  await logAuditEvent(
    'BONAFIDE_REQUEST_CREATED',
    req.user!.userId,
    'BonafideRequest',
    bonafide._id.toString(),
    { purpose: parsed.data.purpose, status: 'SUBMITTED' },
    req.ip
  );

  sendSuccess(res, bonafide, 'Bonafide certificate request submitted successfully', 201);
};

// Student views their own requests
export const getMyBonafideRequests = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const student = await Student.findOne({ userId: req.user!.userId });
    if (!student) {
      sendError(res, 'Student profile not found', 404);
      return;
    }

    const requests = await BonafideRequest.find({ studentId: student._id })
      .sort({ createdAt: -1 })
      .lean();

    sendSuccess(res, { requests }, 'Bonafide requests retrieved');
  } catch (err: any) {
    sendError(res, err.message, 500);
  }
};

// Admin views all bonafide requests
export const getAllBonafideRequests = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const { status, purpose } = req.query;
    const filter: any = {};
    if (status) filter.status = status;
    if (purpose) filter.purpose = purpose;

    const requests = await BonafideRequest.find(filter)
      .populate({
        path: 'studentId',
        select: 'fullName registerNo currentSemester section photoUrl departmentId courseId',
        populate: [
          { path: 'departmentId', select: 'name code' },
          { path: 'courseId', select: 'name code degree' },
        ],
      })
      .sort({ createdAt: -1 })
      .lean();

    sendSuccess(res, { requests }, 'All bonafide requests retrieved');
  } catch (err: any) {
    sendError(res, err.message, 500);
  }
};

// Admin approves bonafide request and issues certificate
export const approveBonafideRequest = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  const { id } = req.params;
  const bonafide = await BonafideRequest.findById(id);
  if (!bonafide) {
    sendError(res, 'Bonafide request not found', 404);
    return;
  }

  if (bonafide.status !== 'SUBMITTED' && bonafide.status !== 'UNDER_REVIEW') {
    sendError(res, `Cannot approve a request with status ${bonafide.status}`, 400);
    return;
  }

  // Generate unique certificate number
  const count = await BonafideRequest.countDocuments({ status: { $in: ['APPROVED', 'ISSUED'] } });
  const year = new Date().getFullYear();
  const certNumber = `GASC/BONA/${year}/${String(count + 1).padStart(4, '0')}`;

  bonafide.status = 'APPROVED';
  bonafide.certificateNumber = certNumber;
  bonafide.approvedBy = new mongoose.Types.ObjectId(req.user!.userId);
  bonafide.approvedAt = new Date();
  bonafide.issuedAt = new Date();

  await bonafide.save();

  await logAuditEvent(
    'BONAFIDE_APPROVED',
    req.user!.userId,
    'BonafideRequest',
    bonafide._id.toString(),
    { certificateNumber: certNumber },
    req.ip
  );

  sendSuccess(res, bonafide, 'Bonafide request approved and certificate issued');
};

// Admin rejects bonafide request
export const rejectBonafideRequest = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  const { id } = req.params;
  const { reason } = req.body;

  if (!reason) {
    sendError(res, 'Rejection reason is required', 400);
    return;
  }

  const bonafide = await BonafideRequest.findById(id);
  if (!bonafide) {
    sendError(res, 'Bonafide request not found', 404);
    return;
  }

  bonafide.status = 'REJECTED';
  bonafide.rejectionReason = reason;
  bonafide.approvedBy = new mongoose.Types.ObjectId(req.user!.userId);
  bonafide.approvedAt = new Date();

  await bonafide.save();

  await logAuditEvent(
    'BONAFIDE_REJECTED',
    req.user!.userId,
    'BonafideRequest',
    bonafide._id.toString(),
    { reason },
    req.ip
  );

  sendSuccess(res, bonafide, 'Bonafide request rejected');
};

// Update request status (review, correction, approve, reject, issue)
export const updateBonafideStatus = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  const { id } = req.params;
  const { status, notes, reason } = req.body;

  const validStatuses = ['UNDER_REVIEW', 'CORRECTION_REQUIRED', 'APPROVED', 'REJECTED', 'ISSUED'];
  if (!validStatuses.includes(status)) {
    sendError(res, `Invalid status. Must be one of: ${validStatuses.join(', ')}`, 400);
    return;
  }

  const bonafide = await BonafideRequest.findById(id);
  if (!bonafide) {
    sendError(res, 'Bonafide request not found', 404);
    return;
  }

  if (status === 'APPROVED' || status === 'ISSUED') {
    if (!bonafide.certificateNumber) {
      const count = await BonafideRequest.countDocuments({ certificateNumber: { $exists: true } });
      const year = new Date().getFullYear();
      bonafide.certificateNumber = `GASC/BONA/${year}/${String(count + 1).padStart(4, '0')}`;
    }
    bonafide.approvedBy = new mongoose.Types.ObjectId(req.user!.userId);
    bonafide.approvedAt = new Date();
    bonafide.issuedAt = new Date();
  } else if (status === 'CORRECTION_REQUIRED') {
    bonafide.correctionNotes = notes || reason || 'Please review and update the indicated admission information';
  } else if (status === 'REJECTED') {
    bonafide.rejectionReason = reason || notes || 'Administrative rejection';
  }

  bonafide.status = status as any;
  bonafide.history.push({
    status: status as any,
    changedBy: new mongoose.Types.ObjectId(req.user!.userId),
    reason: notes || reason,
    timestamp: new Date(),
  });

  await bonafide.save();

  await logAuditEvent(
    'BONAFIDE_STATUS_UPDATED',
    req.user!.userId,
    'BonafideRequest',
    bonafide._id.toString(),
    { status, certificateNumber: bonafide.certificateNumber },
    req.ip
  );

  sendSuccess(res, bonafide, `Bonafide certificate request status updated to ${status}`);
};

// Download official Bonafide Certificate (DOCX / PDF)
export const downloadBonafideDocument = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    const format = (req.query.format as string || '').toLowerCase();
    const bonafide = await BonafideRequest.findById(id).populate({
      path: 'studentId',
      populate: [{ path: 'departmentId' }, { path: 'courseId' }],
    });

    if (!bonafide) {
      sendError(res, 'Certificate not found', 404);
      return;
    }

    if (bonafide.status !== 'APPROVED' && bonafide.status !== 'ISSUED') {
      sendError(res, 'Certificate has not been approved yet', 403);
      return;
    }

    // Authorization check: either admin/faculty or the student themselves
    const student = bonafide.studentId as any;
    if (req.user!.role === 'STUDENT' && student.userId.toString() !== req.user!.userId) {
      sendError(res, 'You are not authorized to view another student certificate', 403);
      return;
    }

    // Format Class Name (e.g., "III B.Sc Computer Science")
    const romanYear = student.year === 1 ? 'I' : student.year === 2 ? 'II' : student.year === 3 ? 'III' : '';
    const degree = student.courseId?.degree || '';
    const course = student.courseId?.name || student.departmentId?.name || 'Arts & Science';
    const className = [romanYear, degree, course].filter(Boolean).join(' ') || 'Undergraduate Degree';

    // Check if client requested DOCX (the authentic Word template format)
    if (format === 'docx') {
      const docxBuffer = await generateBonafideDocxBuffer({
        certificateNo: bonafide.certificateNumber || 'GASC/BONA/ISSUED',
        studentName: student.fullName,
        registerNo: student.registerNo,
        className,
        academicYear: bonafide.academicYear || student.academicYear || '2023-2026',
        shift: student.shift || 'Shift I (Regular)',
        conduct: 'GOOD',
        purpose: bonafide.purpose,
        issueDate: bonafide.issuedAt || bonafide.approvedAt || new Date(),
      });

      await logAuditEvent(
        'BONAFIDE_DOWNLOADED_DOCX',
        req.user!.userId,
        'BonafideRequest',
        bonafide._id.toString(),
        { registerNo: student.registerNo, format: 'docx' },
        req.ip
      );

      res.setHeader(
        'Content-Type',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      );
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="Bonafide_${student.registerNo}.docx"`
      );
      res.send(docxBuffer);
      return;
    }

    // Default to PDF (for backward compatibility and test suite)
    const pdfBuffer = await generateBonafidePDFBuffer({
      certificateNo: bonafide.certificateNumber || `GASC/BONA/TEMP`,
      studentName: student.fullName,
      registerNo: student.registerNo,
      departmentName: student.departmentId?.name || 'Arts & Science',
      degreeName: student.courseId?.name || 'Undergraduate',
      academicYear: bonafide.academicYear,
      purpose: bonafide.purpose,
      issueDate: bonafide.issuedAt ? bonafide.issuedAt.toLocaleDateString('en-IN') : new Date().toLocaleDateString('en-IN'),
    });

    await logAuditEvent(
      'BONAFIDE_DOWNLOADED_PDF',
      req.user!.userId,
      'BonafideRequest',
      bonafide._id.toString(),
      { registerNo: student.registerNo, format: 'pdf' },
      req.ip
    );

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="Bonafide_${student.registerNo}.pdf"`
    );
    res.send(pdfBuffer);
  } catch (err: any) {
    sendError(res, err.message, 500);
  }
};

// Aliases for route backwards compatibility and direct DOCX endpoint
export const downloadBonafidePDF = downloadBonafideDocument;

export const downloadBonafideDocx = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  req.query.format = 'docx';
  return downloadBonafideDocument(req, res);
};

