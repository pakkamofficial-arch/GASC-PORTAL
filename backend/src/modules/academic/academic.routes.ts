import { Router } from 'express';
import {
  getStructureOverview,
  getAllClasses,
  createClass,
  updateClass,
  getClassStudents,
  assignClassInCharge,
  assignSubjectFaculty,
  updateAttendancePolicy,
  getDepartments,
  createDepartment,
  updateDepartment,
  getCourses,
  createCourse,
  updateCourse,
  getBatches,
  createBatch,
  updateBatch,
  getSubjects,
  createSubject,
  updateSubject,
} from './academic.controller';
import { authenticate, authorize } from '../../middleware/auth';

const router = Router();

router.use(authenticate);

// Structure Overview & Classes
router.get('/structure-overview', authorize('ADMIN', 'FACULTY', 'STAFF'), getStructureOverview);
router.get('/classes', authorize('ADMIN', 'FACULTY', 'STAFF'), getAllClasses);
router.post('/classes', authorize('ADMIN'), createClass);
router.patch('/classes/:id', authorize('ADMIN'), updateClass);
router.get('/classes/:classId/students', authorize('ADMIN', 'FACULTY', 'STAFF'), getClassStudents);
router.post('/classes/:id/assign-incharge', authorize('ADMIN', 'FACULTY', 'STAFF'), assignClassInCharge);
router.post('/classes/:id/assign-subject-faculty', authorize('ADMIN', 'FACULTY', 'STAFF'), assignSubjectFaculty);
router.patch('/classes/:id/policy', authorize('ADMIN'), updateAttendancePolicy);

// Departments
router.get('/departments', authorize('ADMIN', 'FACULTY', 'STAFF'), getDepartments);
router.post('/departments', authorize('ADMIN'), createDepartment);
router.patch('/departments/:id', authorize('ADMIN'), updateDepartment);

// Courses
router.get('/courses', authorize('ADMIN', 'FACULTY', 'STAFF'), getCourses);
router.post('/courses', authorize('ADMIN'), createCourse);
router.patch('/courses/:id', authorize('ADMIN'), updateCourse);

// Batches
router.get('/batches', authorize('ADMIN', 'FACULTY', 'STAFF'), getBatches);
router.post('/batches', authorize('ADMIN'), createBatch);
router.patch('/batches/:id', authorize('ADMIN'), updateBatch);

// Subjects
router.get('/subjects', authorize('ADMIN', 'FACULTY', 'STAFF'), getSubjects);
router.post('/subjects', authorize('ADMIN'), createSubject);
router.patch('/subjects/:id', authorize('ADMIN'), updateSubject);

export default router;
