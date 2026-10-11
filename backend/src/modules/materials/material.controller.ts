import { Response } from 'express';
import { z } from 'zod';
import path from 'path';
import fs from 'fs';
import multer from 'multer';
import { StudyMaterial, Faculty, Student } from '../../models';
import { AuthenticatedRequest } from '../../types';
import { sendError, sendSuccess } from '../../utils/response';
import { logAuditEvent } from '../../middleware/audit';

const UPLOADS_DIR = path.join(process.cwd(), 'uploads', 'materials');
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, UPLOADS_DIR);
  },
  filename: (_req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `material-${uniqueSuffix}${ext}`);
  },
});

const allowedMimes = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/msword',
];

const allowedExtensions = ['.pdf', '.docx', '.doc'];

const multerInstance = multer({
  storage,
  limits: { fileSize: 25 * 1024 * 1024 }, // 25 MB
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowedExtensions.includes(ext) || allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file format. Only PDF (.pdf) and Word documents (.docx, .doc) up to 25MB are allowed.'));
    }
  },
}).single('file');

export const materialUploadMiddleware = (req: any, res: any, next: any) => {
  multerInstance(req, res, (err: any) => {
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return sendError(res, 'File size exceeds maximum limit of 25MB.', 400);
      }
      return sendError(res, `Upload error: ${err.message}`, 400);
    } else if (err) {
      return sendError(res, err.message, 400);
    }
    next();
  });
};

const CreateMaterialSchema = z.object({
  title: z.string().min(2),
  description: z.string().optional(),
  departmentId: z.string().min(1),
  courseId: z.string().optional(),
  batchId: z.string().optional(),
  classId: z.string().optional(),
  subjectId: z.string().min(1),
  semester: z.number().min(1).max(8),
  unitOrTopic: z.string().optional(),
  unitNumber: z.number().optional(),
  fileUrl: z.string().min(1),
  fileName: z.string().min(1),
  fileSize: z.number().positive().default(1024),
  fileType: z.string().optional(),
  fileStorageKey: z.string().optional(),
  publicationDate: z.string().optional(),
  isPublished: z.boolean().default(true),
});

export const getMaterials = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const { departmentId, semester, subjectId, courseId, classId } = req.query;
    const filter: any = { isPublished: true, isDeleted: { $ne: true } };

    if (departmentId) filter.departmentId = departmentId;
    if (courseId) filter.courseId = courseId;
    if (classId) filter.classId = classId;
    if (semester) filter.semester = Number(semester);
    if (subjectId) filter.subjectId = subjectId;

    // If student, restrict to their department, course, and semester
    if (req.user?.role === 'STUDENT') {
      const student = await Student.findOne({ userId: req.user.userId });
      if (student) {
        filter.departmentId = student.departmentId;
        filter.semester = student.currentSemester;
        if (student.courseId) filter.courseId = { $in: [student.courseId, undefined, null] };
      }
    }

    const materials = await StudyMaterial.find(filter)
      .populate('subjectId', 'title code credits')
      .populate('departmentId', 'name code')
      .populate('courseId', 'name code')
      .populate('uploadedBy', 'fullName employeeId designation')
      .sort({ createdAt: -1 })
      .lean();

    sendSuccess(res, { materials }, 'Study materials retrieved');
  } catch (err: any) {
    sendError(res, err.message, 500);
  }
};

export const uploadMaterialFile = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    if (!req.file) {
      sendError(res, 'No study material file was uploaded.', 400);
      return;
    }

    const { title, description, departmentId, semester, subjectId, unitOrTopic, courseId, classId, batchId } = req.body;
    if (!title || !departmentId || !subjectId || !semester) {
      if (req.file.path && fs.existsSync(req.file.path)) {
        try { fs.unlinkSync(req.file.path); } catch (_) {}
      }
      sendError(res, 'Title, Department, Semester, and Subject are required.', 422);
      return;
    }

    const faculty = await Faculty.findOne({ userId: req.user!.userId });
    if (!faculty && req.user?.role !== 'ADMIN' && req.user?.role !== 'STAFF' && req.user?.role !== 'FACULTY') {
      if (req.file.path && fs.existsSync(req.file.path)) {
        try { fs.unlinkSync(req.file.path); } catch (_) {}
      }
      sendError(res, 'Only faculty and staff can upload study materials', 403);
      return;
    }

    const ext = path.extname(req.file.originalname).toLowerCase().replace('.', '') || 'pdf';
    const material = await StudyMaterial.create({
      title: title.trim(),
      description: description ? description.trim() : undefined,
      departmentId,
      courseId: courseId || undefined,
      batchId: batchId || undefined,
      classId: classId || undefined,
      subjectId,
      semester: Number(semester),
      unitOrTopic: unitOrTopic ? unitOrTopic.trim() : 'General Notes',
      fileName: req.file.originalname,
      fileSize: req.file.size,
      fileType: ext,
      fileStorageKey: req.file.filename,
      fileUrl: `/api/v1/materials/download/${req.file.filename}`,
      uploadedBy: faculty ? faculty._id : req.user!.userId,
      isPublished: true,
      publicationDate: new Date(),
    });

    await logAuditEvent(
      'MATERIAL_UPLOADED',
      req.user!.userId,
      'StudyMaterial',
      material._id.toString(),
      { title: material.title, fileName: req.file.originalname, size: req.file.size },
      req.ip
    );

    sendSuccess(res, material, 'Study material uploaded successfully', 201);
  } catch (err: any) {
    if (req.file?.path && fs.existsSync(req.file.path)) {
      try { fs.unlinkSync(req.file.path); } catch (_) {}
    }
    sendError(res, err.message, 500);
  }
};

export const createMaterial = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  const parsed = CreateMaterialSchema.safeParse(req.body);
  if (!parsed.success) {
    sendError(res, parsed.error.errors[0].message, 422);
    return;
  }

  const faculty = await Faculty.findOne({ userId: req.user!.userId });
  if (!faculty && req.user?.role !== 'ADMIN' && req.user?.role !== 'STAFF' && req.user?.role !== 'FACULTY') {
    sendError(res, 'Only faculty or administrator can create study materials', 403);
    return;
  }

  const material = await StudyMaterial.create({
    ...parsed.data,
    uploadedBy: faculty ? faculty._id : req.user!.userId,
  });

  await logAuditEvent(
    'MATERIAL_UPLOADED',
    req.user!.userId,
    'StudyMaterial',
    material._id.toString(),
    { title: parsed.data.title },
    req.ip
  );

  sendSuccess(res, material, 'Study material created successfully', 201);
};

export const downloadMaterial = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    let material = await StudyMaterial.findById(id);
    if (!material) {
      material = await StudyMaterial.findOne({ fileStorageKey: id });
    }

    if (!material) {
      sendError(res, 'Study material not found', 404);
      return;
    }

    // Role verification: students can only access materials of their department & semester
    if (req.user?.role === 'STUDENT') {
      const student = await Student.findOne({ userId: req.user.userId });
      if (student) {
        if (
          String(student.departmentId) !== String(material.departmentId) ||
          Number(student.currentSemester) !== Number(material.semester)
        ) {
          sendError(res, 'Access denied: This study material is restricted to another department or semester.', 403);
          return;
        }
      }
    }

    // Increment downloads count
    material.downloadsCount = (material.downloadsCount || 0) + 1;
    await material.save();

    // Check if file exists on disk
    if (material.fileStorageKey) {
      const filePath = path.join(UPLOADS_DIR, material.fileStorageKey);
      if (fs.existsSync(filePath)) {
        res.download(filePath, material.fileName);
        return;
      }
    }

    // If external URL
    if (material.fileUrl && (material.fileUrl.startsWith('http://') || material.fileUrl.startsWith('https://'))) {
      res.redirect(material.fileUrl);
      return;
    }

    // Fallback: check original fileName in uploads directory
    const altPath = path.join(UPLOADS_DIR, material.fileName);
    if (fs.existsSync(altPath)) {
      res.download(altPath, material.fileName);
      return;
    }

    sendError(res, 'Material file content is not available on server storage.', 404);
  } catch (err: any) {
    sendError(res, err.message, 500);
  }
};

export const deleteMaterial = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  const { id } = req.params;
  const material = await StudyMaterial.findById(id);
  if (!material) {
    sendError(res, 'Study material not found', 404);
    return;
  }

  // Soft-delete: retain the underlying file and metadata in the archive for recovery
  material.isDeleted = true;
  material.deletedAt = new Date();
  material.deletedBy = req.user!.userId as any;
  material.deletionReason = req.body?.reason || 'Faculty/Admin archival';
  await material.save();

  await logAuditEvent(
    'MATERIAL_ARCHIVED',
    req.user!.userId,
    'StudyMaterial',
    id,
    { title: material.title, fileName: material.fileName, reason: material.deletionReason },
    req.ip
  );

  sendSuccess(res, null, 'Study material archived safely with recovery retention');
};

export const restoreMaterial = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  const { id } = req.params;
  const material = await StudyMaterial.findById(id);
  if (!material) {
    sendError(res, 'Study material not found', 404);
    return;
  }

  material.isDeleted = false;
  material.deletedAt = undefined;
  material.deletedBy = undefined;
  material.deletionReason = undefined;
  await material.save();

  await logAuditEvent(
    'MATERIAL_RESTORED',
    req.user!.userId,
    'StudyMaterial',
    id,
    { title: material.title, fileName: material.fileName },
    req.ip
  );

  sendSuccess(res, material, 'Study material restored successfully');
};
