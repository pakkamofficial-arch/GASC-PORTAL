import { Router } from 'express';
import {
  getMaterials,
  createMaterial,
  deleteMaterial,
  restoreMaterial,
  uploadMaterialFile,
  downloadMaterial,
  materialUploadMiddleware,
} from './material.controller';
import { authenticate, authorize } from '../../middleware/auth';

const router = Router();

router.use(authenticate);

router.get('/', getMaterials);
router.get('/download/:id', downloadMaterial);
router.post('/upload', authorize('STAFF', 'FACULTY', 'ADMIN'), materialUploadMiddleware, uploadMaterialFile);
router.post('/', authorize('STAFF', 'FACULTY', 'ADMIN'), createMaterial);
router.delete('/:id', authorize('STAFF', 'FACULTY', 'ADMIN'), deleteMaterial);
router.post('/:id/restore', authorize('STAFF', 'FACULTY', 'ADMIN'), restoreMaterial);

export default router;
