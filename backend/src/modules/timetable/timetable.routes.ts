import { Router } from 'express';
import {
  getClassTimetable,
  saveTimetableSlot,
  getCalendarEvents,
  createCalendarEvent,
} from './timetable.controller';
import { authenticate, authorize } from '../../middleware/auth';

const router = Router();

router.use(authenticate);

router.get('/', getClassTimetable);
router.post('/slots', authorize('ADMIN'), saveTimetableSlot);

router.get('/events', getCalendarEvents);
router.post('/events', authorize('ADMIN'), createCalendarEvent);

export default router;
