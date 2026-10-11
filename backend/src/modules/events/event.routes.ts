import { Router } from 'express';
import {
  getEvents,
  createEvent,
  updateEvent,
  deleteEvent,
  restoreEvent,
} from './event.controller';
import { authenticate, authorize } from '../../middleware/auth';

const router = Router();

router.use(authenticate);

router.get('/', getEvents);
router.post('/', authorize('ADMIN', 'FACULTY'), createEvent);
router.put('/:id', authorize('ADMIN', 'FACULTY'), updateEvent);
router.delete('/:id', authorize('ADMIN'), deleteEvent);
router.post('/:id/restore', authorize('ADMIN'), restoreEvent);

export default router;
