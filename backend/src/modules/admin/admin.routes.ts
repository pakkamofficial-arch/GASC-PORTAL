import { Router } from 'express';
import {
  getAdminDashboard,
  listStudents,
  createStudent,
  getStudentById,
  updateStudent,
  promoteStudent,
  getStudentHistory,
  importStudents,
  deleteStudent,
  restoreStudent,
  listFaculty,
  getNextStaffIdEndpoint,
  getFacultyById,
  createFaculty,
  updateFaculty,
  updateFacultyAssignments,
  resetFacultyPassword,
  deleteFaculty,
  restoreFaculty,
  listAcademicStructure,
  toggleUserStatus,
  getAuditLogs,
  resetUserPassword,
  getStaffLeaveRequests,
  updateLeaveRequestStatus,
  getCollegeTemplates,
  saveCollegeTemplate,
  getDatabaseBackupStatus,
  triggerBackup,
  listBackups,
  verifyBackup,
  testRestoreBackup,
  getSecurityOverview,
  getCleanupInventory,
  executeCleanup,
} from './admin.controller';
import { authenticate, authorize } from '../../middleware/auth';

const router = Router();

router.use(authenticate);
router.use(authorize('ADMIN'));

router.get('/dashboard', getAdminDashboard);

// Students Management
router.get('/students', listStudents);
router.post('/students', createStudent);
router.post('/students/import', importStudents);
router.get('/students/:id', getStudentById);
router.patch('/students/:id', updateStudent);
router.delete('/students/:id', deleteStudent);
router.post('/students/:id/restore', restoreStudent);
router.post('/students/:id/promote', promoteStudent);
router.get('/students/:id/history', getStudentHistory);

// Faculty & Staff Management
router.get('/faculty/next-id', getNextStaffIdEndpoint);
router.get('/faculty', listFaculty);
router.post('/faculty', createFaculty);
router.get('/faculty/:id', getFacultyById);
router.patch('/faculty/:id', updateFaculty);
router.patch('/faculty/:id/assignments', updateFacultyAssignments);
router.post('/faculty/:id/reset-password', resetFacultyPassword);
router.delete('/faculty/:id', deleteFaculty);
router.post('/faculty/:id/restore', restoreFaculty);

// Structure & Config
router.get('/structure', listAcademicStructure);
router.patch('/users/:userId/status', toggleUserStatus);
router.patch('/users/:userId/reset-password', resetUserPassword);
router.get('/audit-logs', getAuditLogs);
router.get('/leaves', getStaffLeaveRequests);
router.patch('/leaves/:leaveId', updateLeaveRequestStatus);
router.get('/templates', getCollegeTemplates);
router.post('/templates', saveCollegeTemplate);

// Backup & Disaster Recovery
router.get('/backup/status', getDatabaseBackupStatus);
router.post('/backups', triggerBackup);
router.get('/backups', listBackups);
router.post('/backups/:id/verify', verifyBackup);
router.post('/backups/:id/test-restore', testRestoreBackup);

// Security Dashboard & Data Cleanup
router.get('/security/overview', getSecurityOverview);
router.get('/security/cleanup/inventory', getCleanupInventory);
router.post('/security/cleanup/execute', executeCleanup);

export default router;
