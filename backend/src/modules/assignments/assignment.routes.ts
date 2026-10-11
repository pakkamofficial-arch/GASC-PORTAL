import { Router } from 'express';
import {
  createAssignment,
  getAssignments,
  submitAssignment,
  gradeSubmission,
  getAssignmentSubmissions,
} from './assignment.controller';
import { authenticate, authorize } from '../../middleware/auth';

const router = Router();

router.use(authenticate);

router.get('/', getAssignments);
router.post('/', authorize('FACULTY', 'ADMIN'), createAssignment);
router.get('/:id/submissions', authorize('FACULTY', 'ADMIN'), getAssignmentSubmissions);
router.post('/:id/submit', authorize('STUDENT'), submitAssignment);
router.post('/submissions/:submissionId/grade', authorize('FACULTY', 'ADMIN'), gradeSubmission);

export default router;
