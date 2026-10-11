import { Router } from 'express';
import { getNotices, createNotice } from './notice.controller';
import { authenticate, authorize } from '../../middleware/auth';

const router = Router();

router.use(authenticate);

router.get('/', getNotices);
router.post('/', authorize('ADMIN', 'FACULTY'), createNotice);

export default router;
