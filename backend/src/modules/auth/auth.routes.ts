import { Router } from 'express';
import {
  login,
  refreshToken,
  logout,
  getMe,
  changePassword,
  forgotPassword,
  activateStudent,
  activateStaff,
} from './auth.controller';
import { authenticate } from '../../middleware/auth';
import { loginLimiter, passwordResetLimiter } from '../../middleware/rateLimiter';

const router = Router();

router.post('/login', loginLimiter, login);
router.post('/activate-student', loginLimiter, activateStudent);
router.post('/activate-staff', loginLimiter, activateStaff);
router.post('/refresh', refreshToken);
router.post('/logout', authenticate, logout);
router.get('/me', authenticate, getMe);
router.post('/change-password', authenticate, changePassword);
router.post('/forgot-password', passwordResetLimiter, forgotPassword);

export default router;
