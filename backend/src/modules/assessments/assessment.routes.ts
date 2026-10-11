import { Router } from 'express';
import {
  createAssessment,
  getAssessments,
  getAssessmentDetails,
  saveMarks,
  approveMarks,
  publishMarks,
} from './assessment.controller';
import { authenticate, authorize } from '../../middleware/auth';

const router = Router();

router.use(authenticate);

router.get('/', authorize('FACULTY', 'ADMIN'), getAssessments);
router.post('/', authorize('FACULTY', 'ADMIN'), createAssessment);
router.get('/:id', authorize('FACULTY', 'ADMIN'), getAssessmentDetails);
router.post('/:id/marks', authorize('FACULTY', 'ADMIN'), saveMarks);
router.post('/:id/approve', authorize('ADMIN'), approveMarks);
router.post('/:id/publish', authorize('ADMIN'), publishMarks);

export default router;
