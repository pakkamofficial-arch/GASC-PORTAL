import { Router } from 'express';
import {
  getHODDashboard,
  getHODClasses,
  getHODFaculty,
  getHODTimetable,
  assignTimetableSlot,
  getHODShortages,
} from './hod.controller';
import { authenticate, authorize } from '../../middleware/auth';

const router = Router();

router.use(authenticate);
router.use(authorize('STAFF', 'FACULTY', 'ADMIN'));

router.get('/dashboard', getHODDashboard);
router.get('/classes', getHODClasses);
router.get('/faculty', getHODFaculty);
router.get('/timetable', getHODTimetable);
router.post('/timetable/assign', assignTimetableSlot);
router.get('/shortages', getHODShortages);

export default router;
