import { Router } from 'express';
import {
  getMyIDCard,
  requestIDCard,
  getAllIDCards,
  issueIDCard,
  revokeIDCard,
  verifyCardToken,
} from './idcard.controller';
import { authenticate, authorize } from '../../middleware/auth';

const router = Router();

// Public QR verification endpoint (accessible without authentication for scanners)
router.get('/verify/:token', verifyCardToken);

// Protected routes
router.use(authenticate);

router.get('/my-card', authorize('STUDENT'), getMyIDCard);
router.post('/request', authorize('STUDENT'), requestIDCard);

router.get('/', authorize('ADMIN', 'FACULTY'), getAllIDCards);
router.post('/:id/issue', authorize('ADMIN'), issueIDCard);
router.post('/:id/revoke', authorize('ADMIN'), revokeIDCard);

export default router;
