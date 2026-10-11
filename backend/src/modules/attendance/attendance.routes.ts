import { Router } from 'express';
import {
  getStudentsForAttendance,
  createAttendanceSession,
  getAttendanceHistory,
  getSessionDetails,
  updateAttendanceRecord,
  getAttendanceReports,
  getStudentAttendanceReport,
  getClassAttendanceReport,
} from './attendance.controller';
import { authenticate, authorize } from '../../middleware/auth';

const router = Router();

router.use(authenticate);

// Faculty & Staff & Admin can take attendance and view history
router.get('/students', authorize('FACULTY', 'STAFF', 'ADMIN'), getStudentsForAttendance);
router.post('/sessions', authorize('FACULTY', 'STAFF', 'ADMIN'), createAttendanceSession);
router.get('/history', authorize('FACULTY', 'STAFF', 'ADMIN'), getAttendanceHistory);
router.get('/sessions/:id', authorize('FACULTY', 'STAFF', 'ADMIN'), getSessionDetails);
router.put('/records/:recordId', authorize('FACULTY', 'STAFF', 'ADMIN'), updateAttendanceRecord);

// Reports
router.get('/reports', authorize('FACULTY', 'STAFF', 'ADMIN'), getAttendanceReports);
router.get('/reports/student/:studentId', authorize('STUDENT', 'FACULTY', 'STAFF', 'ADMIN'), getStudentAttendanceReport);
router.get('/reports/class/:classId', authorize('FACULTY', 'STAFF', 'ADMIN'), getClassAttendanceReport);

export default router;
