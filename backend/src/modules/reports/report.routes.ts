import { Router } from 'express';
import {
  getDepartmentSummaryReport,
  getAcademicPerformanceReport,
  getNAACIndicatorsReport,
  exportPDFReport,
  exportCSVReport,
} from './report.controller';
import { authenticate, authorize } from '../../middleware/auth';

const router = Router();

router.use(authenticate);

router.get('/department-summary', authorize('ADMIN', 'FACULTY'), getDepartmentSummaryReport);
router.get('/academic-performance', authorize('ADMIN', 'FACULTY'), getAcademicPerformanceReport);
router.get('/naac-indicators', authorize('ADMIN'), getNAACIndicatorsReport);
router.get('/export/pdf', authorize('ADMIN'), exportPDFReport);
router.get('/export/csv', authorize('ADMIN'), exportCSVReport);

export default router;
