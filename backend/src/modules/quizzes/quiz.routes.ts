import { Router } from 'express';
import {
  createQuiz,
  getQuizzes,
  getQuizForAttempt,
  submitQuizAttempt,
} from './quiz.controller';
import { authenticate, authorize } from '../../middleware/auth';

const router = Router();

router.use(authenticate);

router.get('/', getQuizzes);
router.post('/', authorize('FACULTY', 'ADMIN'), createQuiz);
router.get('/:id/attempt', authorize('STUDENT'), getQuizForAttempt);
router.post('/:id/submit', authorize('STUDENT'), submitQuizAttempt);

export default router;
