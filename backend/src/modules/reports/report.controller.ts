import { Response } from 'express';
import PDFDocument from 'pdfkit';
import {
  Student,
  Faculty,
  Department,
  Course,
  Assessment,
  Mark,
  BonafideRequest,
  Payment,
  StudentFeeAccount,
  AttendanceSession,
} from '../../models';
import { AuthenticatedRequest } from '../../types';
import { sendError, sendSuccess } from '../../utils/response';
import { logAuditEvent } from '../../middleware/audit';
import { config } from '../../config';

export const getDepartmentSummaryReport = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const departments = await Department.find().lean();
    const reports = await Promise.all(
      departments.map(async (dept) => {
        const [studentCount, facultyCount] = await Promise.all([
          Student.countDocuments({ departmentId: dept._id }),
          Faculty.countDocuments({ departmentId: dept._id }),
        ]);

        return {
          departmentId: dept._id,
          code: dept.code,
          name: dept.name,
          studentCount,
          facultyCount,
        };
      })
    );

    await logAuditEvent('REPORT_VIEWED', req.user!.userId, 'Report', undefined, { type: 'DEPARTMENT_SUMMARY' }, req.ip);
    sendSuccess(res, { reports }, 'Department summary report retrieved');
  } catch (err: any) {
    sendError(res, err.message, 500);
  }
};

export const getAcademicPerformanceReport = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const { departmentId, semester } = req.query;
    const filter: any = { status: 'PUBLISHED' };
    if (departmentId) filter.departmentId = departmentId;
    if (semester) filter.semester = Number(semester);

    const assessments = await Assessment.find(filter)
      .populate('subjectId', 'title code')
      .populate('departmentId', 'name code')
      .lean();

    const report = await Promise.all(
      assessments.map(async (a) => {
        const marks = await Mark.find({ assessmentId: a._id }).lean();
        let passCount = 0;
        let failCount = 0;
        let absentCount = 0;
        let totalMarksSum = 0;

        marks.forEach((m) => {
          if (m.isAbsent) {
            absentCount++;
          } else {
            totalMarksSum += m.marksObtained;
            if (m.marksObtained >= a.passingMarks) {
              passCount++;
            } else {
              failCount++;
            }
          }
        });

        const appearedCount = marks.length - absentCount;
        const passPercentage = appearedCount > 0 ? Math.round((passCount / appearedCount) * 100) : 0;
        const averageMark = appearedCount > 0 ? Math.round((totalMarksSum / appearedCount) * 10) / 10 : 0;

        return {
          assessmentId: a._id,
          title: a.title,
          category: a.category,
          department: (a.departmentId as any)?.name,
          subject: (a.subjectId as any)?.title,
          maxMarks: a.maxMarks,
          totalEnrolled: marks.length,
          passCount,
          failCount,
          absentCount,
          passPercentage,
          averageMark,
        };
      })
    );

    sendSuccess(res, { report }, 'Academic performance report generated');
  } catch (err: any) {
    sendError(res, err.message, 500);
  }
};

// NAAC / NIRF Institutional Metric Indicators
export const getNAACIndicatorsReport = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const [
      totalStudents,
      totalFaculty,
      totalDepartments,
      totalCourses,
      assessments,
      feeAccounts,
    ] = await Promise.all([
      Student.countDocuments(),
      Faculty.countDocuments(),
      Department.countDocuments(),
      Course.countDocuments(),
      Assessment.find({ status: 'PUBLISHED' }).lean(),
      StudentFeeAccount.find().lean(),
    ]);

    // Student to Faculty Ratio
    const studentTeacherRatio = totalFaculty > 0 ? Math.round((totalStudents / totalFaculty) * 10) / 10 : 0;

    // Concessions & Welfare Beneficiaries
    const totalBeneficiaries = feeAccounts.filter((f) => f.concessionAmount > 0).length;
    let totalConcessionDisbursed = 0;
    feeAccounts.forEach((f) => (totalConcessionDisbursed += f.concessionAmount || 0));

    const naacMetrics = {
      institution: config.college.name,
      accreditationStatus: 'Affiliated with Annamalai University (Government Institution)',
      criterion1_CurricularAspects: {
        totalUndergraduatePrograms: totalCourses,
        totalDepartments,
        academicSystem: 'Semester Based (CBCS Compliant)',
      },
      criterion2_TeachingLearning: {
        totalEnrolledStudents: totalStudents,
        totalFullTimeFaculty: totalFaculty,
        studentTeacherRatio: `1:${studentTeacherRatio}`,
        evaluatedAssessments: assessments.length,
      },
      criterion5_StudentSupport: {
        governmentWelfareBeneficiaries: totalBeneficiaries,
        totalConcessionDisbursed,
        freeEducationSchemeCompliant: true,
      },
      generatedAt: new Date().toISOString(),
    };

    await logAuditEvent('NAAC_METRICS_VIEWED', req.user!.userId, 'Report', undefined, {}, req.ip);
    sendSuccess(res, naacMetrics, 'NAAC & NIRF institutional indicators retrieved');
  } catch (err: any) {
    sendError(res, err.message, 500);
  }
};

// Export Official PDF Summary Report
export const exportPDFReport = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const [totalStudents, totalFaculty, departments] = await Promise.all([
      Student.countDocuments(),
      Faculty.countDocuments(),
      Department.find().lean(),
    ]);

    const doc = new PDFDocument({ size: 'A4', margin: 40 });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="GASC_Institutional_Report_2026.pdf"');
    doc.pipe(res);

    // Header
    doc.rect(20, 20, doc.page.width - 40, doc.page.height - 40).lineWidth(1.5).strokeColor('#176B3A').stroke();
    doc.moveDown(1.5);
    doc.fontSize(12).fillColor('#176B3A').text('GOVERNMENT OF TAMIL NADU', { align: 'center' });
    doc.fontSize(16).fillColor('#176B3A').text(config.college.name.toUpperCase(), { align: 'center' });
    doc.fontSize(10).fillColor('#202820').text(`${config.college.affiliation} • Kuthalam`, { align: 'center' });
    doc.moveDown(1);
    doc.strokeColor('#DCE7DC').lineWidth(1).moveTo(40, doc.y).lineTo(doc.page.width - 40, doc.y).stroke();
    doc.moveDown(1.5);

    doc.fontSize(15).fillColor('#176B3A').text('INSTITUTIONAL PERFORMANCE & ACADEMIC AUDIT', { align: 'center' });
    doc.fontSize(10).fillColor('#687268').text(`Report Generated: ${new Date().toLocaleDateString('en-IN')}`, { align: 'center' });
    doc.moveDown(1.5);

    // Summary Statistics
    doc.fontSize(12).fillColor('#202820').text('1. Institutional Profile', { underline: true });
    doc.moveDown(0.5);
    doc.fontSize(11).fillColor('#202820')
      .text(`• Total Active Students Enrolled: ${totalStudents}`)
      .text(`• Total Appointed Faculty Members: ${totalFaculty}`)
      .text(`• Academic Departments: ${departments.length}`)
      .text(`• Student to Faculty Ratio: 1:${totalFaculty > 0 ? (totalStudents / totalFaculty).toFixed(1) : 'N/A'}`);

    doc.moveDown(1);
    doc.fontSize(12).fillColor('#202820').text('2. Departmental Breakdown', { underline: true });
    doc.moveDown(0.5);

    for (const d of departments) {
      const sCount = await Student.countDocuments({ departmentId: d._id });
      const fCount = await Faculty.countDocuments({ departmentId: d._id });
      doc.fontSize(10).fillColor('#202820')
        .text(`• [${d.code}] ${d.name}: ${sCount} Students, ${fCount} Faculty`);
    }

    doc.moveDown(2);
    doc.fontSize(10).fillColor('#687268').text('Certified and generated through Government College Connect Portal.', { align: 'center' });
    doc.end();
  } catch (err: any) {
    sendError(res, err.message, 500);
  }
};

// Export CSV / Excel Compatible Report
export const exportCSVReport = async (
  _req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const students = await Student.find()
      .populate('departmentId', 'name code')
      .populate('courseId', 'name')
      .sort({ registerNo: 1 })
      .lean();

    let csv = 'RegisterNo,FullName,Department,Course,Semester,Section,Gender,Email,Phone,AcademicYear\n';
    students.forEach((s: any) => {
      csv += `"${s.registerNo}","${s.fullName}","${s.departmentId?.name || ''}","${s.courseId?.name || ''}",${s.currentSemester},"${s.section}","${s.gender}","${s.email}","${s.phone}","${s.academicYear}"\n`;
    });

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="GASC_Students_Registry_2026.csv"');
    res.status(200).send(csv);
  } catch (err: any) {
    sendError(res, err.message, 500);
  }
};
