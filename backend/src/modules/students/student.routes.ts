import { Router } from 'express';
import {
  getStudentDashboard,
  getMyAttendance,
  getMyMarks,
} from './student.controller';
import {
  listStudents,
  createStudent,
  getStudentById,
  updateStudent,
  promoteStudent,
  getStudentHistory,
  importStudents,
} from '../admin/admin.controller';
import { authenticate, authorize } from '../../middleware/auth';

const router = Router();

router.use(authenticate);

// Student Self-Service Routes (Role: STUDENT)
router.get('/dashboard', authorize('STUDENT'), getStudentDashboard);
router.get('/attendance', authorize('STUDENT'), getMyAttendance);
router.get('/marks', authorize('STUDENT'), getMyMarks);

// Student Administrative / Faculty Management Routes
router.get('/', authorize('ADMIN', 'FACULTY', 'STAFF'), listStudents);
router.post('/', authorize('ADMIN', 'FACULTY', 'STAFF'), createStudent);
router.post('/import', authorize('ADMIN', 'FACULTY', 'STAFF'), importStudents);
router.get('/:id', authorize('ADMIN', 'FACULTY', 'STAFF', 'STUDENT'), getStudentById);
router.patch('/:id', authorize('ADMIN', 'FACULTY', 'STAFF'), updateStudent);
router.post('/:id/promote', authorize('ADMIN', 'FACULTY', 'STAFF'), promoteStudent);
router.get('/:id/history', authorize('ADMIN', 'FACULTY', 'STAFF', 'STUDENT'), getStudentHistory);

export default router;
