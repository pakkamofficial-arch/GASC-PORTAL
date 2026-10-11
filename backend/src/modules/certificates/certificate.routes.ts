import { Router } from 'express';
import {
  createBonafideRequest,
  getMyBonafideRequests,
  getAllBonafideRequests,
  approveBonafideRequest,
  rejectBonafideRequest,
  updateBonafideStatus,
  getCertificatePrefill,
  downloadBonafidePDF,
  downloadBonafideDocument,
  downloadBonafideDocx,
} from './certificate.controller';
import { authenticate, authorize } from '../../middleware/auth';

const router = Router();

router.use(authenticate);

// Student routes
router.get('/prefill', authorize('STUDENT'), getCertificatePrefill);
router.post('/', authorize('STUDENT'), createBonafideRequest);
router.get('/my-requests', authorize('STUDENT'), getMyBonafideRequests);

// Admin / Staff routes
router.get('/', authorize('ADMIN', 'FACULTY'), getAllBonafideRequests);
router.post('/:id/approve', authorize('ADMIN'), approveBonafideRequest);
router.post('/:id/reject', authorize('ADMIN'), rejectBonafideRequest);
router.patch('/:id/status', authorize('ADMIN', 'FACULTY'), updateBonafideStatus);

// Download Certificate (DOCX / PDF) - strictly authorized to student owner, admin, and faculty
router.get('/:id/download', downloadBonafideDocument);
router.get('/:id/download-docx', downloadBonafideDocx);

export default router;
