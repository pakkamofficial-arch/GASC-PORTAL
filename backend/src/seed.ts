import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { connectDatabase, disconnectDatabase } from './config/database';
import {
  User,
  Department,
  Course,
  AcademicBatch,
  Subject,
  CollegeClass,
  Student,
  StudentAcademicHistory,
  Faculty,
  TimetableSlot,
  AttendanceSession,
  AttendanceRecord,
  Assessment,
  Mark,
  BonafideRequest,
  StudentIDCard,
  FeeStructure,
  StudentFeeAccount,
  Payment,
  Assignment,
  Quiz,
  Announcement,
  CalendarEvent,
  CollegeTemplate,
  StudentComplaint,
  StudyMaterial,
  AuditLog,
} from './models';
import { config } from './config';

export const seedDatabase = async (): Promise<void> => {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('[CRITICAL SECURITY ERROR] Destructive database seed script cannot be executed in production environment.');
  }

  // Prevent accidental wiping of cloud or production database instances
  const isRemoteCluster = !config.mongoUri.includes('127.0.0.1') && !config.mongoUri.includes('localhost');
  if (isRemoteCluster && process.env.ALLOW_REMOTE_SEED !== 'true') {
    throw new Error(
      '[CRITICAL DATABASE PROTECTION] Destructive seed script is blocked on remote/cloud databases (Atlas) to protect real data records.'
    );
  }

  await connectDatabase();

  console.log('[Seed] Clearing existing collections for clean demo setup...');
  await Promise.all([
    User.deleteMany({}),
    Department.deleteMany({}),
    Course.deleteMany({}),
    AcademicBatch.deleteMany({}),
    Subject.deleteMany({}),
    CollegeClass.deleteMany({}),
    Student.deleteMany({}),
    StudentAcademicHistory.deleteMany({}),
    Faculty.deleteMany({}),
    TimetableSlot.deleteMany({}),
    AttendanceSession.deleteMany({}),
    AttendanceRecord.deleteMany({}),
    Assessment.deleteMany({}),
    Mark.deleteMany({}),
    BonafideRequest.deleteMany({}),
    StudentIDCard.deleteMany({}),
    FeeStructure.deleteMany({}),
    StudentFeeAccount.deleteMany({}),
    Payment.deleteMany({}),
    Assignment.deleteMany({}),
    Quiz.deleteMany({}),
    Announcement.deleteMany({}),
    CalendarEvent.deleteMany({}),
    CollegeTemplate.deleteMany({}),
    StudentComplaint.deleteMany({}),
    StudyMaterial.deleteMany({}),
    AuditLog.deleteMany({}, { bypassAuditProtection: true } as any),
  ]);

  console.log('[Seed] Creating academic structure (5 Departments, 5 Courses)...');
  
  // 5 DEPARTMENTS
  const deptCS = await Department.create({
    code: 'CS',
    name: 'Department of Computer Science',
    headOfDepartment: 'Dr. S. Sundaram, M.Sc., M.Phil., Ph.D.',
    description: 'Empowering rural students with cutting-edge IT and computing skills.',
  });

  const deptEnglish = await Department.create({
    code: 'ENGLISH',
    name: 'Department of English',
    headOfDepartment: 'Prof. R. Kavitha, M.A., M.Phil.',
    description: 'Fostering English language proficiency, literature appreciation and communication excellence.',
  });

  const deptTamil = await Department.create({
    code: 'TAMIL',
    name: 'Department of Tamil Literature',
    headOfDepartment: 'Dr. K. Arumugam, M.A., Ph.D.',
    description: 'Promoting classical and modern Tamil literary traditions and linguistic heritage.',
  });

  const deptMaths = await Department.create({
    code: 'MATHS',
    name: 'Department of Mathematics',
    headOfDepartment: 'Dr. M. Sangeetha, M.Sc., Ph.D.',
    description: 'Building strong foundations in pure and applied mathematics and quantitative reasoning.',
  });

  const deptCommerce = await Department.create({
    code: 'COMMERCE',
    name: 'Department of Commerce',
    headOfDepartment: 'Prof. P. Venkatesh, M.Com., M.Phil.',
    description: 'Preparing students for accounting, taxation, corporate finance and business leadership.',
  });

  // 5 COURSES (Ug 3-year programmes)
  const courseCS = await Course.create({
    code: 'BSC-CS',
    name: 'B.Sc. Computer Science',
    departmentId: deptCS._id,
    degree: 'UG',
    durationYears: 3,
    totalSemesters: 6,
  });

  const courseEnglish = await Course.create({
    code: 'BA-ENG',
    name: 'B.A. English',
    departmentId: deptEnglish._id,
    degree: 'UG',
    durationYears: 3,
    totalSemesters: 6,
  });

  const courseTamil = await Course.create({
    code: 'BA-TAMIL',
    name: 'B.A. Tamil',
    departmentId: deptTamil._id,
    degree: 'UG',
    durationYears: 3,
    totalSemesters: 6,
  });

  const courseMaths = await Course.create({
    code: 'BSC-MATHS',
    name: 'B.Sc. Mathematics',
    departmentId: deptMaths._id,
    degree: 'UG',
    durationYears: 3,
    totalSemesters: 6,
  });

  const courseCommerce = await Course.create({
    code: 'BCOM',
    name: 'B.Com. Commerce',
    departmentId: deptCommerce._id,
    degree: 'UG',
    durationYears: 3,
    totalSemesters: 6,
  });

  console.log('[Seed] Creating Academic Batches for Courses...');
  const allCourses = [courseCS, courseEnglish, courseTamil, courseMaths, courseCommerce];
  const courseBatches: Record<string, Record<number, any>> = {};

  for (const c of allCourses) {
    const batchY1 = await AcademicBatch.create({
      name: '2024-2027 Batch',
      courseId: c._id,
      admissionYear: 2024,
      graduationYear: 2027,
      status: 'ACTIVE',
    });
    const batchY2 = await AcademicBatch.create({
      name: '2023-2026 Batch',
      courseId: c._id,
      admissionYear: 2023,
      graduationYear: 2026,
      status: 'ACTIVE',
    });
    const batchY3 = await AcademicBatch.create({
      name: '2022-2025 Batch',
      courseId: c._id,
      admissionYear: 2022,
      graduationYear: 2025,
      status: 'ACTIVE',
    });

    courseBatches[c.code] = { 1: batchY1, 2: batchY2, 3: batchY3 };
  }

  console.log('[Seed] Creating Subjects for Departments...');
  // CS Subjects
  const subDBMS = await Subject.create({
    code: 'CS401',
    title: 'Database Management Systems',
    departmentId: deptCS._id,
    semester: 4,
    credits: 4,
    maxInternalMarks: 25,
    maxExternalMarks: 75,
    syllabusOverview: 'Relational Model, SQL, Normalization, Transaction Processing and Indexing.',
  });

  const subJava = await Subject.create({
    code: 'CS402',
    title: 'Java and OOPs Programming',
    departmentId: deptCS._id,
    semester: 4,
    credits: 4,
    maxInternalMarks: 25,
    maxExternalMarks: 75,
  });

  const subOS = await Subject.create({
    code: 'CS403',
    title: 'Operating Systems Principles',
    departmentId: deptCS._id,
    semester: 4,
    credits: 4,
    maxInternalMarks: 25,
    maxExternalMarks: 75,
  });

  const subNetworks = await Subject.create({
    code: 'CS404',
    title: 'Computer Data Networks',
    departmentId: deptCS._id,
    semester: 4,
    credits: 3,
    maxInternalMarks: 25,
    maxExternalMarks: 75,
  });

  // Sample subjects for others
  const subEngProse = await Subject.create({
    code: 'ENG201',
    title: 'British Prose and Poetry',
    departmentId: deptEnglish._id,
    semester: 2,
    credits: 4,
    maxInternalMarks: 25,
    maxExternalMarks: 75,
  });

  const subTamilIru = await Subject.create({
    code: 'TAM101',
    title: 'Ikkala Ilakkiyam',
    departmentId: deptTamil._id,
    semester: 1,
    credits: 4,
    maxInternalMarks: 25,
    maxExternalMarks: 75,
  });

  const subCalculus = await Subject.create({
    code: 'MAT501',
    title: 'Real Analysis and Advanced Calculus',
    departmentId: deptMaths._id,
    semester: 5,
    credits: 4,
    maxInternalMarks: 25,
    maxExternalMarks: 75,
  });

  const subAcc = await Subject.create({
    code: 'COM101',
    title: 'Financial Accounting - I',
    departmentId: deptCommerce._id,
    semester: 1,
    credits: 4,
    maxInternalMarks: 25,
    maxExternalMarks: 75,
  });

  console.log('[Seed] Creating Faculty accounts across departments...');
  const defaultPassword = await bcrypt.hash('Password@123', 12);
  const adminPassword = await bcrypt.hash('Admin@123', 12);

  // 1. ADMIN (Principal)
  const adminUser = await User.create({
    identifier: 'ADMIN001',
    passwordHash: adminPassword,
    role: 'ADMIN',
    status: 'ACTIVE',
    email: 'principal@gasckuthalam.edu.in',
    phone: '9443100001',
    isActivated: true,
  });

  // 2. FACULTY MEMBERS
  // CS Faculty
  const facultyUserCS = await User.create({
    identifier: 'FAC-CS-01',
    passwordHash: defaultPassword,
    role: 'FACULTY',
    status: 'ACTIVE',
    email: 'sundaram.cs@gasckuthalam.edu.in',
    phone: '9842100002',
    isActivated: true,
  });

  const facultyCS = await Faculty.create({
    userId: facultyUserCS._id,
    employeeId: 'FAC-CS-01',
    fullName: 'Dr. S. Sundaram',
    departmentId: deptCS._id,
    designation: 'Associate Professor & HOD',
    qualification: 'M.Sc., M.Phil., Ph.D.',
    email: 'sundaram.cs@gasckuthalam.edu.in',
    phone: '9842100002',
    specialization: 'Database Systems & Networks',
    isHod: true,
    assignedClasses: [
      {
        departmentId: deptCS._id,
        semester: 4,
        section: 'A',
        subjectId: subDBMS._id,
      },
      {
        departmentId: deptCS._id,
        semester: 4,
        section: 'A',
        subjectId: subOS._id,
      },
    ],
  });

  // English Faculty
  const facultyUserEng = await User.create({
    identifier: 'FAC-ENG-01',
    passwordHash: defaultPassword,
    role: 'FACULTY',
    status: 'ACTIVE',
    email: 'kavitha.eng@gasckuthalam.edu.in',
    phone: '9842100003',
    isActivated: true,
  });

  const facultyEng = await Faculty.create({
    userId: facultyUserEng._id,
    employeeId: 'FAC-ENG-01',
    fullName: 'Prof. R. Kavitha',
    departmentId: deptEnglish._id,
    designation: 'Assistant Professor & HOD',
    qualification: 'M.A., M.Phil.',
    email: 'kavitha.eng@gasckuthalam.edu.in',
    phone: '9842100003',
    specialization: 'British Literature',
    isHod: true,
  });

  // Tamil Faculty
  const facultyUserTamil = await User.create({
    identifier: 'FAC-TAM-01',
    passwordHash: defaultPassword,
    role: 'FACULTY',
    status: 'ACTIVE',
    email: 'arumugam.tam@gasckuthalam.edu.in',
    phone: '9842100004',
    isActivated: true,
  });

  const facultyTamil = await Faculty.create({
    userId: facultyUserTamil._id,
    employeeId: 'FAC-TAM-01',
    fullName: 'Dr. K. Arumugam',
    departmentId: deptTamil._id,
    designation: 'Associate Professor & HOD',
    qualification: 'M.A., Ph.D.',
    email: 'arumugam.tam@gasckuthalam.edu.in',
    phone: '9842100004',
    specialization: 'Sangam Literature',
    isHod: true,
  });

  // Maths Faculty
  const facultyUserMath = await User.create({
    identifier: 'FAC-MAT-01',
    passwordHash: defaultPassword,
    role: 'FACULTY',
    status: 'ACTIVE',
    email: 'sangeetha.mat@gasckuthalam.edu.in',
    phone: '9842100005',
    isActivated: true,
  });

  const facultyMath = await Faculty.create({
    userId: facultyUserMath._id,
    employeeId: 'FAC-MAT-01',
    fullName: 'Dr. M. Sangeetha',
    departmentId: deptMaths._id,
    designation: 'Associate Professor & HOD',
    qualification: 'M.Sc., Ph.D.',
    email: 'sangeetha.mat@gasckuthalam.edu.in',
    phone: '9842100005',
    specialization: 'Real Analysis & Differential Equations',
    isHod: true,
  });

  // Commerce Faculty
  const facultyUserCom = await User.create({
    identifier: 'FAC-COM-01',
    passwordHash: defaultPassword,
    role: 'FACULTY',
    status: 'ACTIVE',
    email: 'venkatesh.com@gasckuthalam.edu.in',
    phone: '9842100006',
    isActivated: true,
  });

  const facultyCom = await Faculty.create({
    userId: facultyUserCom._id,
    employeeId: 'FAC-COM-01',
    fullName: 'Prof. P. Venkatesh',
    departmentId: deptCommerce._id,
    designation: 'Assistant Professor & HOD',
    qualification: 'M.Com., M.Phil.',
    email: 'venkatesh.com@gasckuthalam.edu.in',
    phone: '9842100006',
    specialization: 'Financial Accounting & Taxation',
    isHod: true,
  });

  // Unactivated Faculty for First-time Staff Activation Testing
  const pendingFacultyUser = await User.create({
    identifier: 'FAC-CS-02',
    passwordHash: await bcrypt.hash('TEMP_' + Math.random(), 10),
    role: 'FACULTY',
    status: 'PENDING',
    email: 'murugesan.cs@gasckuthalam.edu.in',
    phone: '9842100099',
    isActivated: false,
    activationCode: 'GASC-ACT-7890',
  });

  await Faculty.create({
    userId: pendingFacultyUser._id,
    employeeId: 'FAC-CS-02',
    fullName: 'Dr. T. Murugesan',
    departmentId: deptCS._id,
    designation: 'Assistant Professor',
    qualification: 'M.Sc., Ph.D.',
    email: 'murugesan.cs@gasckuthalam.edu.in',
    phone: '9842100099',
    specialization: 'Cloud Computing & Cyber Security',
    isHod: false,
  });

  // Link HODs to Departments
  deptCS.hodFacultyId = facultyCS._id as any;
  await deptCS.save();
  deptEnglish.hodFacultyId = facultyEng._id as any;
  await deptEnglish.save();
  deptTamil.hodFacultyId = facultyTamil._id as any;
  await deptTamil.save();
  deptMaths.hodFacultyId = facultyMath._id as any;
  await deptMaths.save();
  deptCommerce.hodFacultyId = facultyCom._id as any;
  await deptCommerce.save();

  console.log('[Seed] Creating 15 Year-Level Classes (5 Courses x 3 Years)...');
  const academicYear = '2024-2025';

  const coursesDef = [
    { course: courseCS, dept: deptCS, inCharges: [undefined, facultyCS._id, undefined] },
    { course: courseEnglish, dept: deptEnglish, inCharges: [undefined, facultyEng._id, undefined] },
    { course: courseTamil, dept: deptTamil, inCharges: [facultyTamil._id, undefined, undefined] },
    { course: courseMaths, dept: deptMaths, inCharges: [undefined, undefined, facultyMath._id] },
    { course: courseCommerce, dept: deptCommerce, inCharges: [facultyCom._id, undefined, undefined] },
  ];

  const createdClasses: Record<string, any> = {};

  for (const cDef of coursesDef) {
    for (let yr = 1; yr <= 3; yr++) {
      const sem = yr * 2; // e.g. Year 1 = Sem 2, Year 2 = Sem 4, Year 3 = Sem 6
      const inChargeId = cDef.inCharges[yr - 1];

      const cls = await CollegeClass.create({
        courseId: cDef.course._id,
        departmentId: cDef.dept._id,
        batchId: courseBatches[cDef.course.code][yr]._id,
        year: yr,
        section: 'A',
        academicYear,
        currentSemester: sem,
        classInCharge: inChargeId,
        inChargeHistory: inChargeId
          ? [
              {
                facultyId: inChargeId,
                assignedAt: new Date(),
                assignedBy: adminUser._id,
              },
            ]
          : [],
        subjectAssignments:
          cDef.course.code === 'BSC-CS' && yr === 2
            ? [
                { subjectId: subDBMS._id, facultyId: facultyCS._id, assignedAt: new Date() },
                { subjectId: subJava._id, facultyId: facultyCS._id, assignedAt: new Date() },
                { subjectId: subOS._id, facultyId: facultyCS._id, assignedAt: new Date() },
              ]
            : [],
        attendancePolicy: 'PERIOD_WISE',
        roomNo: `Block-A Room ${cDef.course.code.slice(0, 3)}-${yr}01`,
        active: true,
      });

      const key = `${cDef.course.code}-Y${yr}`;
      createdClasses[key] = cls;
    }
  }

  const classBscCsY2 = createdClasses['BSC-CS-Y2'];

  console.log('[Seed] Creating Students across classes...');
  // 1. Primary Demo Student: Murugan K in B.Sc CS 2nd Year
  const studentUserMurugan = await User.create({
    identifier: '23UCS042',
    passwordHash: defaultPassword,
    role: 'STUDENT',
    status: 'ACTIVE',
    email: 'murugan.k@student.gasckuthalam.edu.in',
    phone: '9789100042',
    isActivated: true,
  });

  const studentMurugan = await Student.create({
    userId: studentUserMurugan._id,
    registerNo: '23UCS042',
    rollNumber: '23UCS042',
    fullName: 'Murugan K',
    departmentId: deptCS._id,
    courseId: courseCS._id,
    batchId: courseBatches['BSC-CS'][2]._id,
    classId: classBscCsY2._id,
    year: 2,
    currentSemester: 4,
    section: 'A',
    academicYear,
    admissionDate: new Date('2023-06-20'),
    dob: new Date('2005-06-15'),
    gender: 'MALE',
    email: 'murugan.k@student.gasckuthalam.edu.in',
    phone: '9789100042',
    guardianName: 'Kasirajan M',
    guardianPhone: '9442100042',
    guardianRelationship: 'Father',
    emergencyContact: '9442100042',
    address: '12 South Car Street, Kuthalam, Mayiladuthurai District - 609801',
    bloodGroup: 'O+',
    community: 'BC',
    previousEducation: {
      schoolName: 'Govt Higher Secondary School, Kuthalam',
      board: 'State Board',
      tenthMarks: 412,
      twelfthMarks: 518,
      tcNumber: 'TC-2023-984',
    },
    idCardStatus: 'ISSUED',
  });

  await StudentAcademicHistory.create({
    studentId: studentMurugan._id,
    classId: classBscCsY2._id,
    year: 2,
    section: 'A',
    academicYear,
    effectiveFrom: new Date('2023-06-20'),
    changeReason: 'ADMISSION',
    changedBy: adminUser._id,
  });

  // 2. Classmate Anitha R
  const studentUserAnitha = await User.create({
    identifier: '23UCS001',
    passwordHash: defaultPassword,
    role: 'STUDENT',
    status: 'ACTIVE',
    email: 'anitha.r@student.gasckuthalam.edu.in',
    phone: '9789100001',
    isActivated: true,
  });

  const studentAnitha = await Student.create({
    userId: studentUserAnitha._id,
    registerNo: '23UCS001',
    rollNumber: '23UCS001',
    fullName: 'Anitha R',
    departmentId: deptCS._id,
    courseId: courseCS._id,
    batchId: courseBatches['BSC-CS'][2]._id,
    classId: classBscCsY2._id,
    year: 2,
    currentSemester: 4,
    section: 'A',
    academicYear,
    admissionDate: new Date('2023-06-20'),
    dob: new Date('2005-04-20'),
    gender: 'FEMALE',
    email: 'anitha.r@student.gasckuthalam.edu.in',
    phone: '9789100001',
    guardianName: 'Ramasamy T',
    guardianPhone: '9442100001',
    guardianRelationship: 'Father',
    address: '4 Main Road, Kuthalam, Mayiladuthurai - 609801',
    bloodGroup: 'B+',
    community: 'MBC',
    idCardStatus: 'ISSUED',
  });

  await StudentAcademicHistory.create({
    studentId: studentAnitha._id,
    classId: classBscCsY2._id,
    year: 2,
    section: 'A',
    academicYear,
    effectiveFrom: new Date('2023-06-20'),
    changeReason: 'ADMISSION',
    changedBy: adminUser._id,
  });

  // 3. Classmate Karthik S
  const studentUserKarthik = await User.create({
    identifier: '23UCS015',
    passwordHash: defaultPassword,
    role: 'STUDENT',
    status: 'ACTIVE',
    email: 'karthik.s@student.gasckuthalam.edu.in',
    phone: '9789100015',
    isActivated: true,
  });

  const studentKarthik = await Student.create({
    userId: studentUserKarthik._id,
    registerNo: '23UCS015',
    rollNumber: '23UCS015',
    fullName: 'Karthik S',
    departmentId: deptCS._id,
    courseId: courseCS._id,
    batchId: courseBatches['BSC-CS'][2]._id,
    classId: classBscCsY2._id,
    year: 2,
    currentSemester: 4,
    section: 'A',
    academicYear,
    admissionDate: new Date('2023-06-20'),
    dob: new Date('2005-09-10'),
    gender: 'MALE',
    email: 'karthik.s@student.gasckuthalam.edu.in',
    phone: '9789100015',
    guardianName: 'Subramanian V',
    guardianPhone: '9442100015',
    guardianRelationship: 'Father',
    address: '8 North Street, Kuthalam - 609801',
    bloodGroup: 'A+',
    community: 'BC',
    idCardStatus: 'ISSUED',
  });

  await StudentAcademicHistory.create({
    studentId: studentKarthik._id,
    classId: classBscCsY2._id,
    year: 2,
    section: 'A',
    academicYear,
    effectiveFrom: new Date('2023-06-20'),
    changeReason: 'ADMISSION',
    changedBy: adminUser._id,
  });

  // 4. Students in other classes
  // English 1st Year student
  const studentUserPriya = await User.create({
    identifier: '24UEN005',
    passwordHash: defaultPassword,
    role: 'STUDENT',
    status: 'ACTIVE',
    email: 'priya.m@student.gasckuthalam.edu.in',
    phone: '9789100055',
    isActivated: true,
  });

  const studentPriya = await Student.create({
    userId: studentUserPriya._id,
    registerNo: '24UEN005',
    rollNumber: '24UEN005',
    fullName: 'Priya M',
    departmentId: deptEnglish._id,
    courseId: courseEnglish._id,
    batchId: courseBatches['BA-ENG'][1]._id,
    classId: createdClasses['BA-ENG-Y1']._id,
    year: 1,
    currentSemester: 2,
    section: 'A',
    academicYear,
    admissionDate: new Date('2024-06-25'),
    dob: new Date('2006-03-14'),
    gender: 'FEMALE',
    email: 'priya.m@student.gasckuthalam.edu.in',
    phone: '9789100055',
    guardianName: 'Manickam P',
    guardianPhone: '9442100055',
    address: '22 Bazaar Street, Kuthalam - 609801',
    idCardStatus: 'ISSUED',
  });

  await StudentAcademicHistory.create({
    studentId: studentPriya._id,
    classId: createdClasses['BA-ENG-Y1']._id,
    year: 1,
    section: 'A',
    academicYear,
    effectiveFrom: new Date('2024-06-25'),
    changeReason: 'ADMISSION',
    changedBy: adminUser._id,
  });

  // Tamil 1st Year student
  const studentUserSelvam = await User.create({
    identifier: '24UTA012',
    passwordHash: defaultPassword,
    role: 'STUDENT',
    status: 'ACTIVE',
    email: 'selvam.v@student.gasckuthalam.edu.in',
    phone: '9789100012',
    isActivated: true,
  });

  const studentSelvam = await Student.create({
    userId: studentUserSelvam._id,
    registerNo: '24UTA012',
    rollNumber: '24UTA012',
    fullName: 'Selvam V',
    departmentId: deptTamil._id,
    courseId: courseTamil._id,
    batchId: courseBatches['BA-TAMIL'][1]._id,
    classId: createdClasses['BA-TAMIL-Y1']._id,
    year: 1,
    currentSemester: 2,
    section: 'A',
    academicYear,
    admissionDate: new Date('2024-06-25'),
    dob: new Date('2006-11-02'),
    gender: 'MALE',
    email: 'selvam.v@student.gasckuthalam.edu.in',
    phone: '9789100012',
    guardianName: 'Velusamy K',
    guardianPhone: '9442100012',
    address: 'Agraharam, Kuthalam - 609801',
    idCardStatus: 'ISSUED',
  });

  await StudentAcademicHistory.create({
    studentId: studentSelvam._id,
    classId: createdClasses['BA-TAMIL-Y1']._id,
    year: 1,
    section: 'A',
    academicYear,
    effectiveFrom: new Date('2024-06-25'),
    changeReason: 'ADMISSION',
    changedBy: adminUser._id,
  });

  // Commerce 1st Year student
  const studentUserVignesh = await User.create({
    identifier: '24UCO031',
    passwordHash: defaultPassword,
    role: 'STUDENT',
    status: 'ACTIVE',
    email: 'vignesh.r@student.gasckuthalam.edu.in',
    phone: '9789100031',
    isActivated: true,
  });

  const studentVignesh = await Student.create({
    userId: studentUserVignesh._id,
    registerNo: '24UCO031',
    rollNumber: '24UCO031',
    fullName: 'Vignesh R',
    departmentId: deptCommerce._id,
    courseId: courseCommerce._id,
    batchId: courseBatches['BCOM'][1]._id,
    classId: createdClasses['BCOM-Y1']._id,
    year: 1,
    currentSemester: 2,
    section: 'A',
    academicYear,
    admissionDate: new Date('2024-06-25'),
    dob: new Date('2006-05-18'),
    gender: 'MALE',
    email: 'vignesh.r@student.gasckuthalam.edu.in',
    phone: '9789100031',
    guardianName: 'Rangarajan N',
    guardianPhone: '9442100031',
    address: 'Hospital Road, Mayiladuthurai - 609001',
    idCardStatus: 'ISSUED',
  });

  await StudentAcademicHistory.create({
    studentId: studentVignesh._id,
    classId: createdClasses['BCOM-Y1']._id,
    year: 1,
    section: 'A',
    academicYear,
    effectiveFrom: new Date('2024-06-25'),
    changeReason: 'ADMISSION',
    changedBy: adminUser._id,
  });

  // Unactivated Student for First-Time Student Activation Testing (DOB + RegNo verification)
  const pendingStudentUser = await User.create({
    identifier: '24UCS099',
    passwordHash: await bcrypt.hash('TEMP_PW_' + Math.random(), 10),
    role: 'STUDENT',
    status: 'PENDING',
    email: 'aravind.k@student.gasckuthalam.edu.in',
    phone: '9789100099',
    isActivated: false,
  });

  const studentAravind = await Student.create({
    userId: pendingStudentUser._id,
    registerNo: '24UCS099',
    rollNumber: '24UCS099',
    fullName: 'Aravind Kumar S',
    departmentId: deptCS._id,
    courseId: courseCS._id,
    batchId: courseBatches['BSC-CS'][1]._id,
    classId: createdClasses['BSC-CS-Y1']._id,
    year: 1,
    currentSemester: 2,
    section: 'A',
    academicYear,
    admissionDate: new Date('2024-07-01'),
    dob: new Date('2006-08-12'),
    gender: 'MALE',
    email: 'aravind.k@student.gasckuthalam.edu.in',
    phone: '9789100099',
    guardianName: 'Sundaresan T',
    guardianPhone: '9442100099',
    guardianRelationship: 'Father',
    address: 'East Street, Kuthalam - 609801',
    bloodGroup: 'B+',
    idCardStatus: 'PENDING',
  });

  await StudentAcademicHistory.create({
    studentId: studentAravind._id,
    classId: createdClasses['BSC-CS-Y1']._id,
    year: 1,
    section: 'A',
    academicYear,
    effectiveFrom: new Date('2024-07-01'),
    changeReason: 'ADMISSION',
    changedBy: adminUser._id,
  });

  console.log('[Seed] Creating Timetable slots for CS 2nd Year...');
  const days = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY'] as const;
  const timePeriods = [
    { period: 1, start: '09:30', end: '10:30', sub: subDBMS },
    { period: 2, start: '10:30', end: '11:30', sub: subJava },
    { period: 3, start: '11:45', end: '12:45', sub: subOS },
    { period: 4, start: '01:30', end: '02:30', sub: subNetworks },
    { period: 5, start: '02:30', end: '03:30', sub: subDBMS },
  ];

  for (const day of days) {
    for (const p of timePeriods) {
      await TimetableSlot.create({
        academicYear,
        semester: 4,
        departmentId: deptCS._id,
        section: 'A',
        dayOfWeek: day,
        periodNo: p.period,
        startTime: p.start,
        endTime: p.end,
        subjectId: p.sub._id,
        facultyId: facultyCS._id,
        roomNo: 'Lab-2 (CS Block)',
      });
    }
  }

  console.log('[Seed] Creating realistic attendance sessions...');
  const sessionDates = [
    new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
    new Date(Date.now() - 4 * 24 * 60 * 60 * 1000),
    new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
    new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
    new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
  ];

  for (let i = 0; i < sessionDates.length; i++) {
    const sDate = sessionDates[i];
    sDate.setUTCHours(0, 0, 0, 0);

    const session = await AttendanceSession.create({
      academicYear,
      semester: 4,
      departmentId: deptCS._id,
      section: 'A',
      subjectId: subDBMS._id,
      facultyId: facultyCS._id,
      date: sDate,
      period: 1,
      totalStudents: 3,
      presentCount: i === 3 ? 2 : 3,
      absentCount: i === 3 ? 1 : 0,
      isFinalized: true,
    });

    await AttendanceRecord.create([
      {
        sessionId: session._id,
        studentId: studentMurugan._id,
        status: i === 3 ? 'ABSENT' : 'PRESENT',
        remarks: i === 3 ? 'Fever / Leave letter submitted' : 'Present in class',
      },
      {
        sessionId: session._id,
        studentId: studentAnitha._id,
        status: 'PRESENT',
      },
      {
        sessionId: session._id,
        studentId: studentKarthik._id,
        status: 'PRESENT',
      },
    ]);
  }

  console.log('[Seed] Creating Assessments and Marks...');
  const test1 = await Assessment.create({
    title: 'Continuous Internal Assessment - I (CIA 1)',
    category: 'INTERNAL_TEST',
    academicYear,
    semester: 4,
    departmentId: deptCS._id,
    subjectId: subDBMS._id,
    maxMarks: 25,
    passingMarks: 10,
    assessmentDate: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
    entryDeadline: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
    status: 'PUBLISHED',
    facultyId: facultyCS._id,
    approvedBy: adminUser._id,
    approvedAt: new Date(),
    publishedAt: new Date(),
  });

  await Mark.create([
    {
      assessmentId: test1._id,
      studentId: studentMurugan._id,
      subjectId: subDBMS._id,
      marksObtained: 22,
      isAbsent: false,
      grade: 'A+',
      enteredBy: facultyUserCS._id,
    },
    {
      assessmentId: test1._id,
      studentId: studentAnitha._id,
      subjectId: subDBMS._id,
      marksObtained: 24,
      isAbsent: false,
      grade: 'O',
      enteredBy: facultyUserCS._id,
    },
    {
      assessmentId: test1._id,
      studentId: studentKarthik._id,
      subjectId: subDBMS._id,
      marksObtained: 19,
      isAbsent: false,
      grade: 'A',
      enteredBy: facultyUserCS._id,
    },
  ]);

  // Draft assessment for CIA 2
  await Assessment.create({
    title: 'Continuous Internal Assessment - II (CIA 2)',
    category: 'INTERNAL_TEST',
    academicYear,
    semester: 4,
    departmentId: deptCS._id,
    subjectId: subDBMS._id,
    maxMarks: 25,
    passingMarks: 10,
    assessmentDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
    entryDeadline: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000),
    status: 'DRAFT',
    facultyId: facultyCS._id,
  });

  console.log('[Seed] Creating Digital ID Card & Bonafide Certificate...');
  await StudentIDCard.create({
    studentId: studentMurugan._id,
    cardNumber: 'GASC-ID-2024-0042',
    issueDate: new Date('2023-08-01'),
    expiryDate: new Date('2027-05-31'),
    status: 'ISSUED',
    qrVerificationToken: 'verify_murugan_k_23ucs042_token_gasc2026',
    approvedBy: adminUser._id,
    approvedAt: new Date('2023-08-05'),
  });

  await BonafideRequest.create({
    studentId: studentMurugan._id,
    purpose: 'BUS_PASS',
    additionalDetails: 'TNSTC Student Concession Bus Pass from Kuthalam to Mayiladuthurai route',
    status: 'APPROVED',
    certificateNumber: 'GASC/BONA/2026/0014',
    approvedBy: adminUser._id,
    approvedAt: new Date(),
    issuedAt: new Date(),
    academicYear,
    templateVersion: 1,
  });

  console.log('[Seed] Creating Document Templates (Bonafide, Conduct, Transfer)...');
  await CollegeTemplate.create([
    {
      templateType: 'BONAFIDE',
      title: 'Standard Bonafide Certificate Template',
      version: 1,
      effectiveDate: new Date('2024-01-01'),
      contentTemplate:
        'This is to certify that {STUDENT_NAME} (Register No: {REGISTER_NO}) is a bonafide student of Government Arts and Science College, Kuthalam, currently studying in {COURSE_NAME}, {YEAR} Year during the academic year {ACADEMIC_YEAR}.\n\nThis certificate is issued upon student request for the purpose of: {PURPOSE}.',
      headerText:
        'GOVERNMENT ARTS AND SCIENCE COLLEGE, KUTHALAM\nMayiladuthurai District, Tamil Nadu - 609801\n(Affiliated to Annamalai University)',
      footerText:
        'This certificate is digitally verified and issued through Government College Connect Portal.',
      signatoryTitle: 'Principal',
      signatoryName: 'Dr. Principal, M.Sc., Ph.D.',
      requiredFields: ['STUDENT_NAME', 'REGISTER_NO', 'COURSE_NAME', 'YEAR', 'ACADEMIC_YEAR', 'PURPOSE'],
      isActive: true,
      uploadedBy: 'Principal Office',
    },
    {
      templateType: 'CONDUCT',
      title: 'Institutional Conduct and Character Certificate',
      version: 1,
      effectiveDate: new Date('2024-01-01'),
      contentTemplate:
        'This is to certify that {STUDENT_NAME} (Register No: {REGISTER_NO}) has been a student of {COURSE_NAME} at this institution. During the period of study, their conduct and character have been GOOD.',
      headerText:
        'GOVERNMENT ARTS AND SCIENCE COLLEGE, KUTHALAM\nMayiladuthurai District, Tamil Nadu - 609801',
      footerText: 'Official Institution Seal and Principal Signature Certificate.',
      signatoryTitle: 'Principal',
      signatoryName: 'Dr. Principal, M.Sc., Ph.D.',
      requiredFields: ['STUDENT_NAME', 'REGISTER_NO', 'COURSE_NAME'],
      isActive: true,
      uploadedBy: 'Principal Office',
    },
    {
      templateType: 'TRANSFER',
      title: 'Official Transfer Certificate (TC) Template',
      version: 1,
      effectiveDate: new Date('2024-01-01'),
      contentTemplate:
        'Transfer Certificate for {STUDENT_NAME} (Reg. No: {REGISTER_NO}). Left the institution upon completion of course {COURSE_NAME}. Fee dues: Cleared. Conduct: Satisfactory.',
      headerText:
        'GOVERNMENT OF TAMIL NADU - COLLEGIATE EDUCATION DEPARTMENT\nGOVERNMENT ARTS AND SCIENCE COLLEGE, KUTHALAM',
      footerText: 'Countersigned by Directorate of Collegiate Education, Chennai.',
      signatoryTitle: 'Principal',
      signatoryName: 'Dr. Principal, M.Sc., Ph.D.',
      requiredFields: ['STUDENT_NAME', 'REGISTER_NO', 'COURSE_NAME', 'ACADEMIC_YEAR'],
      isActive: true,
      uploadedBy: 'Principal Office',
    },
  ]);

  console.log('[Seed] Creating Fee structure and student fee accounts...');
  const feeStruct = await FeeStructure.create({
    academicYear,
    semester: 4,
    departmentId: deptCS._id,
    degree: 'UG',
    tuitionFee: 0,
    specialFee: 450,
    labFee: 600,
    libraryFee: 150,
    examFee: 800,
    otherFee: 200,
    totalAmount: 2200,
    dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
  });

  await StudentFeeAccount.create({
    studentId: studentMurugan._id,
    academicYear,
    semester: 4,
    feeStructureId: feeStruct._id,
    baseAmount: 2200,
    concessionAmount: 0,
    netPayable: 2200,
    paidAmount: 1000,
    balanceAmount: 1200,
    status: 'PARTIAL',
  });

  await Payment.create({
    orderId: 'ORD_GASC_INIT_001',
    studentId: studentMurugan._id,
    feeAccountId: feeStruct._id,
    transactionId: 'TXN_GASC_UPI_9823412',
    amount: 1000,
    paymentMethod: 'UPI (Google Pay / PhonePe)',
    status: 'SUCCESS',
    verifiedAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000),
    receiptUrl: '/api/v1/payments/receipts/REC/GASC/2026/00042',
  });

  console.log('[Seed] Creating Study Materials and Student Complaints...');
  await StudyMaterial.create({
    title: 'Unit 1 & 2 DBMS Lecture Notes - Relational Algebra & SQL',
    description: 'Comprehensive lecture handouts with solved query problems for B.Sc CS Semester 4.',
    departmentId: deptCS._id,
    courseId: courseCS._id,
    classId: classBscCsY2._id,
    subjectId: subDBMS._id,
    semester: 4,
    unitNumber: 1,
    unitOrTopic: 'Relational Database Fundamentals',
    fileUrl: '/uploads/materials/dbms_unit1_2_lecture_notes.pdf',
    fileName: 'dbms_unit1_2_lecture_notes.pdf',
    fileSize: 2458900,
    isPublished: true,
    downloadsCount: 14,
    uploadedBy: facultyCS._id,
  });

  await StudentComplaint.create({
    ticketNumber: 'CMP-2026-0001',
    studentId: studentMurugan._id,
    category: 'INFRASTRUCTURE',
    subject: 'Projector display flickering in Smart Classroom 2',
    description:
      'The HDMI connection and bulb on the ceiling projector in Computer Science Lab 2 flickers continuously during the afternoon session.',
    status: 'UNDER_REVIEW',
    priority: 'MEDIUM',
    internalNotes: 'Technician from Mayiladuthurai IT Services contacted. Scheduled for maintenance on Saturday.',
    history: [
      {
        status: 'SUBMITTED',
        changedBy: studentUserMurugan._id,
        comment: 'Grievance submitted by student',
        timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      },
      {
        status: 'UNDER_REVIEW',
        changedBy: adminUser._id,
        comment: 'Assigned to Computer Science Department maintenance representative',
        timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
      },
    ],
  });

  console.log('[Seed] Creating Announcements & Calendar Events...');
  await Announcement.create([
    {
      title: 'Annamalai University Semester Examination Fee Circular',
      content: 'All undergraduate students are advised to remit their semester examination fees before the specified deadline.',
      targetRole: 'ALL',
      priority: 'HIGH',
      publishedBy: adminUser._id,
      publishedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
    },
    {
      title: 'GASC Special Seminar on Artificial Intelligence in Tamil Computing',
      content: 'Department of Computer Science cordially invites all students to a guest lecture on Natural Language Processing for Tamil by eminent professors.',
      targetRole: 'STUDENT',
      priority: 'NORMAL',
      departmentId: deptCS._id,
      publishedBy: facultyUserCS._id,
      publishedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
    },
  ]);

  await CalendarEvent.create([
    {
      title: 'Annamalai University Semester Theory Examinations',
      description: 'End semester theory examinations for all UG departments.',
      startDate: new Date('2026-05-02'),
      endDate: new Date('2026-05-25'),
      type: 'EXAM',
      targetAudience: 'ALL',
      venue: 'Main Exam Halls 1-6',
      organizer: 'Examination Cell',
      isPublished: true,
      publishedBy: adminUser._id,
    },
    {
      title: 'Tamil New Year & Dr. Ambedkar Jayanti Holiday',
      description: 'State government gazetted public holiday for college.',
      startDate: new Date('2026-04-14'),
      endDate: new Date('2026-04-14'),
      type: 'HOLIDAY',
      targetAudience: 'ALL',
      venue: 'Campus Wide',
      organizer: 'Principal Office',
      isPublished: true,
      publishedBy: adminUser._id,
    },
    {
      title: 'Inter-College State Level Tech Fest - Kuthalam GASC 2026',
      description: 'Paper presentations, code debugging, web development competitions.',
      startDate: new Date('2026-04-24'),
      endDate: new Date('2026-04-25'),
      type: 'SEMINAR',
      targetAudience: 'ALL',
      venue: 'College Auditorium & Computer Center',
      organizer: 'Department of Computer Science',
      isPublished: true,
      publishedBy: facultyUserCS._id,
    },
  ]);

  console.log('===============================================================');
  console.log('🎉 SEEDING COMPLETED SUCCESSFULLY FOR GASC KUTHALAM!');
  console.log('===============================================================');
  console.log('5 Courses & 15 Year-Level Classes initialized:');
  console.log('  1. B.Sc. Computer Science (1st, 2nd, 3rd Year)');
  console.log('  2. B.A. English (1st, 2nd, 3rd Year)');
  console.log('  3. B.A. Tamil (1st, 2nd, 3rd Year)');
  console.log('  4. B.Sc. Mathematics (1st, 2nd, 3rd Year)');
  console.log('  5. B.Com. Commerce (1st, 2nd, 3rd Year)');
  console.log('---------------------------------------------------------------');
  console.log('Key Accounts:');
  console.log('1. STUDENT (ACTIVE):  Reg: 23UCS042   / Pass: Password@123 (Murugan K, CS Y2)');
  console.log('2. STUDENT (PENDING): Reg: 24UCS099   / DOB: 2006-08-12   (Aravind Kumar, CS Y1)');
  console.log('3. FACULTY (ACTIVE):  Emp: FAC-CS-01  / Pass: Password@123 (Dr. S. Sundaram)');
  console.log('4. FACULTY (PENDING): Emp: FAC-CS-02  / Code: GASC-ACT-7890 (Dr. T. Murugesan)');
  console.log('5. ADMIN (ACTIVE):    Id:  ADMIN001   / Pass: Admin@123    (Principal)');
  console.log('===============================================================');

  await disconnectDatabase();
};

if (require.main === module) {
  seedDatabase()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('[Seed Error]:', err);
      process.exit(1);
    });
}
