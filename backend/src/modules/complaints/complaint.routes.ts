import { Router } from 'express';
import {
  createComplaint,
  getMyComplaints,
  getAllComplaints,
  updateComplaintStatus,
} from './complaint.controller';
import { authenticate, authorize } from '../../middleware/auth';

const router = Router();

router.use(authenticate);

// Student routes
router.post('/', authorize('STUDENT'), createComplaint);
router.get('/my', authorize('STUDENT'), getMyComplaints);

// Admin & Staff oversight routes
router.get('/', authorize('ADMIN', 'FACULTY'), getAllComplaints);
router.patch('/:id', authorize('ADMIN', 'FACULTY'), updateComplaintStatus);

export default router;
