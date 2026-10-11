import { Response } from 'express';
import { z } from 'zod';
import mongoose from 'mongoose';
import {
  CollegeClass,
  Course,
  Department,
  Subject,
  Faculty,
  Student,
  AcademicBatch,
} from '../../models';
import { AuthenticatedRequest } from '../../types';
import { sendError, sendSuccess } from '../../utils/response';
import { logAuditEvent } from '../../middleware/audit';

export const getStructureOverview = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const [courses, classes, departments, batches, totalStudents, totalFaculty] = await Promise.all([
      Course.find().populate('departmentId', 'name code').lean(),
      CollegeClass.find({ active: true })
        .populate('courseId', 'name code degree durationYears')
        .populate('departmentId', 'name code')
        .populate('batchId', 'name admissionYear graduationYear status')
        .populate('classInCharge', 'fullName employeeId designation')
        .populate('subjectAssignments.subjectId', 'title code')
        .populate('subjectAssignments.facultyId', 'fullName employeeId')
        .lean(),
      Department.find().populate('hodFacultyId', 'fullName employeeId designation').lean(),
      AcademicBatch.find().populate('courseId', 'name code').lean(),
      Student.countDocuments(),
      Faculty.countDocuments(),
    ]);

    // Calculate student count per class & course
    const classMetrics = await Promise.all(
      classes.map(async (cls) => {
        const studentCount = await Student.countDocuments({
          $or: [
            { classId: cls._id },
            {
              courseId: cls.courseId?._id || cls.courseId,
              year: cls.year,
              section: cls.section,
            },
          ],
        });

        return {
          ...cls,
          studentCount,
          isInChargeVacant: !cls.classInCharge,
        };
      })
    );

    const vacantInChargeCount = classMetrics.filter((c) => c.isInChargeVacant).length;

    // Course student counts
    const courseBreakdown = await Promise.all(
      courses.map(async (course) => {
        const count = await Student.countDocuments({ courseId: course._id });
        const courseClasses = classMetrics.filter(
          (c: any) => String(c.courseId?._id || c.courseId) === String(course._id)
        );
        return {
          courseId: course._id,
          code: course.code,
          name: course.name,
          degree: course.degree,
          studentCount: count,
          classesCount: courseClasses.length,
        };
      })
    );

    sendSuccess(
      res,
      {
        totalCourses: courses.length,
        totalClasses: classes.length,
        totalDepartments: departments.length,
        totalBatches: batches.length,
        totalStudents,
        totalFaculty,
        vacantInChargeCount,
        classes: classMetrics,
        courses: courseBreakdown,
        departments,
        batches,
      },
      'College academic hierarchy overview retrieved successfully'
    );
  } catch (err: any) {
    sendError(res, err.message, 500);
  }
};

export const getAllClasses = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const { courseId, year, academicYear, batchId } = req.query;
    const filter: any = { active: true };
    if (courseId) filter.courseId = courseId;
    if (year) filter.year = Number(year);
    if (academicYear) filter.academicYear = academicYear;
    if (batchId) filter.batchId = batchId;

    const classes = await CollegeClass.find(filter)
      .populate('courseId', 'name code degree durationYears')
      .populate('departmentId', 'name code')
      .populate('batchId', 'name admissionYear graduationYear status')
      .populate('classInCharge', 'fullName employeeId designation email phone')
      .populate('subjectAssignments.subjectId', 'title code credits')
      .populate('subjectAssignments.facultyId', 'fullName employeeId designation')
      .sort({ courseId: 1, year: 1, section: 1 })
      .lean();

    const result = await Promise.all(
      classes.map(async (cls) => {
        const studentCount = await Student.countDocuments({
          $or: [
            { classId: cls._id },
            {
              courseId: cls.courseId?._id || cls.courseId,
              year: cls.year,
              section: cls.section,
            },
          ],
        });
        return { ...cls, studentCount };
      })
    );

    sendSuccess(res, { classes: result }, 'Classes retrieved successfully');
  } catch (err: any) {
    sendError(res, err.message, 500);
  }
};

export const getClassStudents = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const { classId } = req.params;
    const cls = await CollegeClass.findById(classId)
      .populate('courseId', 'name code')
      .populate('departmentId', 'name code')
      .populate('batchId', 'name admissionYear graduationYear')
      .lean();

    if (!cls) {
      sendError(res, 'Class not found', 404);
      return;
    }

    const students = await Student.find({
      $or: [
        { classId: cls._id },
        {
          courseId: cls.courseId?._id || cls.courseId,
          year: cls.year,
          section: cls.section,
        },
      ],
    })
      .populate('userId', 'status lastLogin')
      .populate('departmentId', 'name code')
      .populate('courseId', 'name code')
      .sort({ registerNo: 1 })
      .lean();

    sendSuccess(res, { class: cls, students, total: students.length }, 'Class student roster retrieved');
  } catch (err: any) {
    sendError(res, err.message, 500);
  }
};

const AssignInChargeSchema = z.object({
  facultyId: z.string().min(1, 'Faculty ID is required'),
  reason: z.string().optional(),
});

export const assignClassInCharge = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    const parsed = AssignInChargeSchema.safeParse(req.body);
    if (!parsed.success) {
      sendError(res, parsed.error.errors[0].message, 422);
      return;
    }

    const collegeClass = await CollegeClass.findById(id);
    if (!collegeClass) {
      sendError(res, 'Class group not found', 404);
      return;
    }

    const faculty = await Faculty.findById(parsed.data.facultyId);
    if (!faculty) {
      sendError(res, 'Faculty member not found', 404);
      return;
    }

    // Check if faculty is already active in-charge of another class in this academic year
    const existingActiveAssignment = await CollegeClass.findOne({
      _id: { $ne: collegeClass._id },
      academicYear: collegeClass.academicYear,
      classInCharge: faculty._id,
      active: true,
    }).populate('courseId', 'name');

    if (existingActiveAssignment) {
      sendError(
        res,
        `Prof. ${faculty.fullName} is already assigned as Class In-Charge of ${(existingActiveAssignment.courseId as any)?.name} Year ${existingActiveAssignment.year} (${existingActiveAssignment.section}). A faculty member cannot have conflicting active in-charge positions.`,
        409
      );
      return;
    }

    // Revoke current in-charge if any and record history
    if (collegeClass.classInCharge) {
      const lastHistory = collegeClass.inChargeHistory[collegeClass.inChargeHistory.length - 1];
      if (lastHistory && !lastHistory.revokedAt) {
        lastHistory.revokedAt = new Date();
      }
    }

    collegeClass.inChargeHistory.push({
      facultyId: faculty._id,
      assignedAt: new Date(),
      assignedBy: req.user!.userId as any,
      reason: parsed.data.reason || 'Appointed by Principal Office',
    });

    collegeClass.classInCharge = faculty._id;
    await collegeClass.save();

    await logAuditEvent(
      'CLASS_INCHARGE_ASSIGNED',
      req.user!.userId,
      'CollegeClass',
      collegeClass._id.toString(),
      {
        facultyId: faculty._id.toString(),
        facultyName: faculty.fullName,
        year: collegeClass.year,
        section: collegeClass.section,
      },
      req.ip
    );

    const updated = await CollegeClass.findById(collegeClass._id)
      .populate('courseId', 'name code')
      .populate('classInCharge', 'fullName employeeId designation')
      .lean();

    sendSuccess(res, updated, `Prof. ${faculty.fullName} successfully assigned as Class In-Charge`);
  } catch (err: any) {
    sendError(res, err.message, 500);
  }
};

const AssignSubjectFacultySchema = z.object({
  subjectId: z.string().min(1, 'Subject ID is required'),
  facultyId: z.string().min(1, 'Faculty ID is required'),
});

export const assignSubjectFaculty = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    const parsed = AssignSubjectFacultySchema.safeParse(req.body);
    if (!parsed.success) {
      sendError(res, parsed.error.errors[0].message, 422);
      return;
    }

    const collegeClass = await CollegeClass.findById(id);
    if (!collegeClass) {
      sendError(res, 'Class group not found', 404);
      return;
    }

    const [subject, faculty] = await Promise.all([
      Subject.findById(parsed.data.subjectId),
      Faculty.findById(parsed.data.facultyId),
    ]);

    if (!subject || !faculty) {
      sendError(res, 'Subject or Faculty member not found', 404);
      return;
    }

    // Check if subject is already in subjectAssignments
    const existingIndex = collegeClass.subjectAssignments.findIndex(
      (sa) => String(sa.subjectId) === String(subject._id)
    );

    if (existingIndex >= 0) {
      collegeClass.subjectAssignments[existingIndex].facultyId = faculty._id;
      collegeClass.subjectAssignments[existingIndex].assignedAt = new Date();
    } else {
      collegeClass.subjectAssignments.push({
        subjectId: subject._id,
        facultyId: faculty._id,
        assignedAt: new Date(),
      });
    }

    await collegeClass.save();

    // Ensure Faculty assignedClasses also contains this allocation
    const alreadyAllocated = faculty.assignedClasses.some(
      (ac) =>
        String(ac.subjectId) === String(subject._id) &&
        ac.semester === collegeClass.currentSemester &&
        ac.section === collegeClass.section
    );

    if (!alreadyAllocated) {
      faculty.assignedClasses.push({
        departmentId: collegeClass.departmentId,
        semester: collegeClass.currentSemester,
        section: collegeClass.section,
        subjectId: subject._id,
      });
      await faculty.save();
    }

    await logAuditEvent(
      'SUBJECT_FACULTY_ASSIGNED',
      req.user!.userId,
      'CollegeClass',
      collegeClass._id.toString(),
      {
        subject: subject.title,
        faculty: faculty.fullName,
      },
      req.ip
    );

    sendSuccess(
      res,
      collegeClass,
      `Prof. ${faculty.fullName} assigned to teach ${subject.title}`
    );
  } catch (err: any) {
    sendError(res, err.message, 500);
  }
};

export const updateAttendancePolicy = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    const { policy } = req.body;

    if (!['PERIOD_WISE', 'DAILY'].includes(policy)) {
      sendError(res, "Attendance policy must be 'PERIOD_WISE' or 'DAILY'", 400);
      return;
    }

    const collegeClass = await CollegeClass.findByIdAndUpdate(
      id,
      { attendancePolicy: policy },
      { new: true }
    );

    if (!collegeClass) {
      sendError(res, 'Class group not found', 404);
      return;
    }

    await logAuditEvent(
      'ATTENDANCE_POLICY_CHANGED',
      req.user!.userId,
      'CollegeClass',
      collegeClass._id.toString(),
      { policy },
      req.ip
    );

    sendSuccess(res, collegeClass, `Attendance policy updated to ${policy}`);
  } catch (err: any) {
    sendError(res, err.message, 500);
  }
};

// CRUD for Departments
export const getDepartments = async (_req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const departments = await Department.find()
      .populate('hodFacultyId', 'fullName employeeId designation email phone')
      .sort({ name: 1 })
      .lean();
    sendSuccess(res, { departments }, 'Departments retrieved');
  } catch (err: any) {
    sendError(res, err.message, 500);
  }
};

export const createDepartment = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { code, name, headOfDepartment, hodFacultyId, description } = req.body;
    if (!code || !name) {
      sendError(res, 'Code and Name are required', 400);
      return;
    }
    const dept = await Department.create({
      code: code.trim().toUpperCase(),
      name: name.trim(),
      headOfDepartment,
      hodFacultyId,
      description,
    });
    sendSuccess(res, dept, 'Department created successfully', 201);
  } catch (err: any) {
    sendError(res, err.message, 500);
  }
};

export const updateDepartment = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const updated = await Department.findByIdAndUpdate(id, req.body, { new: true });
    if (!updated) {
      sendError(res, 'Department not found', 404);
      return;
    }
    sendSuccess(res, updated, 'Department updated successfully');
  } catch (err: any) {
    sendError(res, err.message, 500);
  }
};

// CRUD for Courses
export const getCourses = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { departmentId } = req.query;
    const filter: any = {};
    if (departmentId) filter.departmentId = departmentId;
    const courses = await Course.find(filter)
      .populate('departmentId', 'name code')
      .sort({ name: 1 })
      .lean();
    sendSuccess(res, { courses }, 'Courses retrieved');
  } catch (err: any) {
    sendError(res, err.message, 500);
  }
};

export const createCourse = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { code, name, departmentId, degree, durationYears, totalSemesters } = req.body;
    if (!code || !name || !departmentId) {
      sendError(res, 'Code, Name, and Department are required', 400);
      return;
    }
    const course = await Course.create({
      code: code.trim().toUpperCase(),
      name: name.trim(),
      departmentId,
      degree: degree || 'UG',
      durationYears: durationYears || 3,
      totalSemesters: totalSemesters || 6,
    });
    sendSuccess(res, course, 'Course created successfully', 201);
  } catch (err: any) {
    sendError(res, err.message, 500);
  }
};

export const updateCourse = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const updated = await Course.findByIdAndUpdate(id, req.body, { new: true });
    if (!updated) {
      sendError(res, 'Course not found', 404);
      return;
    }
    sendSuccess(res, updated, 'Course updated successfully');
  } catch (err: any) {
    sendError(res, err.message, 500);
  }
};

// CRUD for Academic Batches
export const getBatches = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { courseId } = req.query;
    const filter: any = {};
    if (courseId) filter.courseId = courseId;
    const batches = await AcademicBatch.find(filter)
      .populate('courseId', 'name code')
      .sort({ admissionYear: -1 })
      .lean();
    sendSuccess(res, { batches }, 'Academic batches retrieved');
  } catch (err: any) {
    sendError(res, err.message, 500);
  }
};

export const createBatch = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { name, courseId, admissionYear, graduationYear, status } = req.body;
    if (!name || !courseId || !admissionYear || !graduationYear) {
      sendError(res, 'Batch Name, Course, Admission Year, and Graduation Year are required', 400);
      return;
    }
    const batch = await AcademicBatch.create({
      name: name.trim(),
      courseId,
      admissionYear: Number(admissionYear),
      graduationYear: Number(graduationYear),
      status: status || 'ACTIVE',
    });
    sendSuccess(res, batch, 'Academic batch created successfully', 201);
  } catch (err: any) {
    sendError(res, err.message, 500);
  }
};

export const updateBatch = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const updated = await AcademicBatch.findByIdAndUpdate(id, req.body, { new: true });
    if (!updated) {
      sendError(res, 'Batch not found', 404);
      return;
    }
    sendSuccess(res, updated, 'Batch updated successfully');
  } catch (err: any) {
    sendError(res, err.message, 500);
  }
};

// CRUD for Classes
export const createClass = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { courseId, departmentId, batchId, year, section, academicYear, currentSemester, roomNo } = req.body;
    if (!courseId || !departmentId || !year || !academicYear) {
      sendError(res, 'Course, Department, Year, and Academic Year are required', 400);
      return;
    }

    const cls = await CollegeClass.create({
      courseId,
      departmentId,
      batchId,
      year: Number(year),
      section: (section || 'A').toUpperCase(),
      academicYear,
      currentSemester: currentSemester || (Number(year) * 2 - 1),
      roomNo,
      active: true,
    });

    sendSuccess(res, cls, 'Class group created successfully', 201);
  } catch (err: any) {
    sendError(res, err.message, 500);
  }
};

export const updateClass = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const updated = await CollegeClass.findByIdAndUpdate(id, req.body, { new: true });
    if (!updated) {
      sendError(res, 'Class group not found', 404);
      return;
    }
    sendSuccess(res, updated, 'Class group updated successfully');
  } catch (err: any) {
    sendError(res, err.message, 500);
  }
};

// CRUD for Subjects
export const getSubjects = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { departmentId, semester } = req.query;
    const filter: any = {};
    if (departmentId) filter.departmentId = departmentId;
    if (semester) filter.semester = Number(semester);

    const subjects = await Subject.find(filter)
      .populate('departmentId', 'name code')
      .sort({ semester: 1, code: 1 })
      .lean();
    sendSuccess(res, { subjects }, 'Subjects retrieved');
  } catch (err: any) {
    sendError(res, err.message, 500);
  }
};

export const createSubject = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { code, title, departmentId, semester, credits, maxInternalMarks, maxExternalMarks, syllabusOverview } = req.body;
    if (!code || !title || !departmentId || !semester) {
      sendError(res, 'Code, Title, Department, and Semester are required', 400);
      return;
    }

    const subject = await Subject.create({
      code: code.trim().toUpperCase(),
      title: title.trim(),
      departmentId,
      semester: Number(semester),
      credits: credits || 4,
      maxInternalMarks: maxInternalMarks || 25,
      maxExternalMarks: maxExternalMarks || 75,
      syllabusOverview,
    });

    sendSuccess(res, subject, 'Subject created successfully', 201);
  } catch (err: any) {
    sendError(res, err.message, 500);
  }
};

export const updateSubject = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const updated = await Subject.findByIdAndUpdate(id, req.body, { new: true });
    if (!updated) {
      sendError(res, 'Subject not found', 404);
      return;
    }
    sendSuccess(res, updated, 'Subject updated successfully');
  } catch (err: any) {
    sendError(res, err.message, 500);
  }
};
