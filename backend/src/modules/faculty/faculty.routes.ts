import { Router } from 'express';
import {
  getFacultyDashboard,
  submitLeaveRequest,
  getMyLeaveRequests,
} from './faculty.controller';
import { authenticate, authorize } from '../../middleware/auth';

const router = Router();

router.use(authenticate);
router.use(authorize('FACULTY'));

router.get('/dashboard', getFacultyDashboard);
router.post('/leave', submitLeaveRequest);
router.get('/leave', getMyLeaveRequests);

export default router;
