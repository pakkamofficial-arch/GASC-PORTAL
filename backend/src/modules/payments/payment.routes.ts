import { Router } from 'express';
import {
  getMyFeeDetails,
  createPaymentOrder,
  verifyAndRecordPayment,
  getAdminPaymentReconciliation,
} from './payment.controller';
import { authenticate, authorize } from '../../middleware/auth';

const router = Router();

router.use(authenticate);

// Student fee views & payments
router.get('/my-fees', authorize('STUDENT'), getMyFeeDetails);
router.post('/orders', authorize('STUDENT'), createPaymentOrder);
router.post('/verify', authorize('STUDENT'), verifyAndRecordPayment);

// Admin reconciliation
router.get('/reconciliation', authorize('ADMIN'), getAdminPaymentReconciliation);

export default router;
