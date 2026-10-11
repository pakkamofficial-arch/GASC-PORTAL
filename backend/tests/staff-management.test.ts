import request from 'supertest';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { createApp } from '../src/app';
import { connectDatabase, disconnectDatabase } from '../src/config/database';
import { User, Faculty, Department, Subject } from '../src/models';

const app = createApp();

describe('GOVERNMENT COLLEGE CONNECT - Staff Management & Role Security Suite', () => {
  let adminToken: string;
  let studentToken: string;
  let csDepartmentId: string;
  let csSubjectId: string;

  beforeAll(async () => {
    await connectDatabase();

    // Admin login
    const adminRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ identifier: 'ADMIN001', password: 'Admin@123' });
    expect(adminRes.status).toBe(200);
    adminToken = adminRes.body.data.tokens.accessToken;

    // Student login
    const studentRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ identifier: '23UCS042', password: 'Password@123' });
    expect(studentRes.status).toBe(200);
    studentToken = studentRes.body.data.tokens.accessToken;

    // Get Department & Subject for tests
    const dept = await Department.findOne({ code: 'CS' });
    if (dept) csDepartmentId = dept._id.toString();

    const subj = await Subject.findOne();
    if (subj) csSubjectId = subj._id.toString();
  });

  afterAll(async () => {
    await disconnectDatabase();
  });

  // TEST 1: Admin can generate next available Staff ID
  it('1. should generate a unique, sequential Staff ID on backend (e.g. GASCK-STF-XXX)', async () => {
    const res = await request(app)
      .get('/api/v1/admin/faculty/next-id')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.nextStaffId).toBeDefined();
    expect(res.body.data.nextStaffId).toMatch(/^GASCK-STF-\d{3}$/);
  });

  // TEST 2: Admin can create a staff account with auto-generated Staff ID and secure temp password
  let createdStaffId: string;
  let createdStaffEmployeeId: string;
  let createdTempPassword: string;

  it('2. Admin can create a staff account with auto-generated ID and temporary password', async () => {
    const res = await request(app)
      .post('/api/v1/admin/faculty')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        fullName: 'Dr. R. Senthamil Selvan',
        departmentId: csDepartmentId,
        designation: 'Associate Professor',
        qualification: 'M.Sc., M.Phil., Ph.D.',
        email: 'senthamil.selvan@gasc.edu.in',
        phone: '9842156789',
        dob: '1982-04-12',
        address: '15, Sannathi Street, Kuthalam, Mayiladuthurai',
        specialization: 'Artificial Intelligence & Neural Networks',
        autoGenerateId: true,
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.faculty).toBeDefined();
    expect(res.body.data.temporaryPassword).toBeDefined();
    expect(res.body.data.mustChangePassword).toBe(true);

    createdStaffId = res.body.data.faculty._id;
    createdStaffEmployeeId = res.body.data.faculty.employeeId;
    createdTempPassword = res.body.data.temporaryPassword;

    // Verify password is NOT stored in plaintext in the database
    const userDoc = await User.findById(res.body.data.userId);
    expect(userDoc).toBeDefined();
    expect(userDoc!.passwordHash).not.toBe(createdTempPassword);
    expect(await bcrypt.compare(createdTempPassword, userDoc!.passwordHash)).toBe(true);
    expect(userDoc!.mustChangePassword).toBe(true);
  });

  // TEST 3: Duplicate Staff ID is rejected with 409
  it('3. should reject duplicate Staff ID with 409 Conflict', async () => {
    const res = await request(app)
      .post('/api/v1/admin/faculty')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        employeeId: createdStaffEmployeeId, // Same ID
        fullName: 'Another Faculty Name',
        departmentId: csDepartmentId,
        designation: 'Assistant Professor',
        qualification: 'Ph.D.',
        email: 'another.fac@gasc.edu.in',
        phone: '9876543210',
        autoGenerateId: false,
      });

    expect(res.status).toBe(409);
    expect(res.body.success).toBe(false);
  });

  // TEST 4: Initial weak passwords are rejected
  it('4. should reject weak initial passwords during staff creation', async () => {
    const res = await request(app)
      .post('/api/v1/admin/faculty')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        fullName: 'Dr. Test Weak Password',
        departmentId: csDepartmentId,
        designation: 'Assistant Professor',
        qualification: 'Ph.D.',
        email: 'test.weak@gasc.edu.in',
        phone: '9876543211',
        password: 'password', // Weak password
        autoGenerateId: true,
      });

    expect(res.status).toBe(422);
    expect(res.body.success).toBe(false);
  });

  // TEST 5: Staff can log in with valid credentials
  it('5. Staff can log in with their Staff ID and temporary password, returning mustChangePassword flag', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({
        identifier: createdStaffEmployeeId,
        password: createdTempPassword,
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.tokens.accessToken).toBeDefined();
    expect(res.body.data.mustChangePassword).toBe(true);
    expect(res.body.data.user.mustChangePassword).toBe(true);
  });

  // TEST 6: Invalid passwords are rejected
  it('6. should reject login attempts with invalid passwords', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({
        identifier: createdStaffEmployeeId,
        password: 'WrongPassword@999',
      });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  // TEST 7: Staff with mustChangePassword cannot access protected features before password change
  let staffTempToken: string;

  it('7. First login requires password change (protected endpoints block access until changed)', async () => {
    // Login to get token
    const loginRes = await request(app)
      .post('/api/v1/auth/login')
      .send({
        identifier: createdStaffEmployeeId,
        password: createdTempPassword,
      });

    staffTempToken = loginRes.body.data.tokens.accessToken;

    // Attempting to post notices before password change is blocked
    const blockedRes = await request(app)
      .post('/api/v1/notices')
      .set('Authorization', `Bearer ${staffTempToken}`)
      .send({
        title: 'Unauthorized Announcement',
        content: 'Should be rejected',
      });

    expect(blockedRes.status).toBe(403);
    expect(blockedRes.body.message).toContain('password change required');
  });

  // TEST 8: Password change validates strength, rejects current temp password reuse, and completes first-time setup
  let staffPermanentToken: string;

  it('8. Staff must change temporary password to a strong new password to activate full access', async () => {
    // Reusing the same temporary password is rejected
    const sameRes = await request(app)
      .post('/api/v1/auth/change-password')
      .set('Authorization', `Bearer ${staffTempToken}`)
      .send({
        currentPassword: createdTempPassword,
        newPassword: createdTempPassword,
      });

    expect(sameRes.status).toBe(400);

    // Using a weak password is rejected
    const weakRes = await request(app)
      .post('/api/v1/auth/change-password')
      .set('Authorization', `Bearer ${staffTempToken}`)
      .send({
        currentPassword: createdTempPassword,
        newPassword: 'weak',
      });

    expect(weakRes.status).toBe(422);

    // Setting a strong password succeeds
    const successRes = await request(app)
      .post('/api/v1/auth/change-password')
      .set('Authorization', `Bearer ${staffTempToken}`)
      .send({
        currentPassword: createdTempPassword,
        newPassword: 'SecureStaff@2026',
      });

    expect(successRes.status).toBe(200);
    expect(successRes.body.success).toBe(true);
    expect(successRes.body.data.user.mustChangePassword).toBe(false);
    expect(successRes.body.data.tokens.accessToken).toBeDefined();

    staffPermanentToken = successRes.body.data.tokens.accessToken;

    // Verify DB user record has mustChangePassword = false
    const updatedUser = await User.findOne({ identifier: createdStaffEmployeeId });
    expect(updatedUser!.mustChangePassword).toBe(false);
    expect(updatedUser!.isActivated).toBe(true);
  });

  // TEST 9: After password change, staff can access their authorized features
  it('9. Staff can now access authorized features using permanent credentials', async () => {
    const res = await request(app)
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${staffPermanentToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.user.identifier).toBe(createdStaffEmployeeId);
  });

  // TEST 10: Staff cannot access Admin-only APIs
  it('10. Staff cannot access Admin-only management endpoints (403 Forbidden)', async () => {
    const res = await request(app)
      .get('/api/v1/admin/dashboard')
      .set('Authorization', `Bearer ${staffPermanentToken}`);

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);

    const backupRes = await request(app)
      .get('/api/v1/admin/backups')
      .set('Authorization', `Bearer ${staffPermanentToken}`);

    expect(backupRes.status).toBe(403);
  });

  // TEST 11: Students cannot modify attendance or circulars
  it('11. Students cannot create attendance sessions or publish circulars (403 Forbidden)', async () => {
    const attRes = await request(app)
      .post('/api/v1/attendance/sessions')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({
        departmentId: csDepartmentId,
        semester: 3,
        section: 'A',
        subjectId: csSubjectId,
        academicYear: '2024-2025',
        date: '2026-10-11',
        period: 1,
        records: [],
      });

    expect(attRes.status).toBe(403);

    const noticeRes = await request(app)
      .post('/api/v1/notices')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({
        title: 'Student Attempted Notice',
        content: 'Not allowed',
      });

    expect(noticeRes.status).toBe(403);
  });

  // TEST 12: Admin can edit staff details and persist changes
  it('12. Admin can edit staff details and changes persist correctly in database', async () => {
    const res = await request(app)
      .patch(`/api/v1/admin/faculty/${createdStaffId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        designation: 'Professor & Head (AI)',
        phone: '9842199999',
        address: '45, College Road, Kuthalam',
        specialization: 'Deep Learning & Natural Language Processing',
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.faculty.designation).toBe('Professor & Head (AI)');
    expect(res.body.data.faculty.phone).toBe('9842199999');

    // Cross-verify in DB
    const dbFaculty = await Faculty.findById(createdStaffId);
    expect(dbFaculty!.designation).toBe('Professor & Head (AI)');
    expect(dbFaculty!.address).toBe('45, College Road, Kuthalam');
  });

  // TEST 13: Admin can assign courses/classes/subjects to staff
  it('13. Admin can assign classes and subjects to staff member', async () => {
    const res = await request(app)
      .patch(`/api/v1/admin/faculty/${createdStaffId}/assignments`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        assignedClasses: [
          {
            departmentId: csDepartmentId,
            semester: 4,
            section: 'A',
            subjectId: csSubjectId,
          },
        ],
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.faculty.assignedClasses.length).toBe(1);

    const dbFaculty = await Faculty.findById(createdStaffId);
    expect(dbFaculty!.assignedClasses.length).toBe(1);
    expect(dbFaculty!.assignedClasses[0].semester).toBe(4);
    expect(dbFaculty!.assignedClasses[0].section).toBe('A');
  });

  // TEST 14: Admin can securely trigger staff password reset
  it('14. Admin can securely reset staff password, generating new temporary password', async () => {
    const res = await request(app)
      .post(`/api/v1/admin/faculty/${createdStaffId}/reset-password`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.temporaryPassword).toBeDefined();
    expect(res.body.data.mustChangePassword).toBe(true);

    const resetTempPass = res.body.data.temporaryPassword;

    // User can now log in with the new temp password
    const loginRes = await request(app)
      .post('/api/v1/auth/login')
      .send({
        identifier: createdStaffEmployeeId,
        password: resetTempPass,
      });

    expect(loginRes.status).toBe(200);
    expect(loginRes.body.data.mustChangePassword).toBe(true);
  });

  // TEST 15: Deactivated/suspended staff cannot access protected features
  it('15. Deactivated/suspended staff cannot log in or access protected features', async () => {
    // Admin suspends the staff account
    const suspendRes = await request(app)
      .patch(`/api/v1/admin/users/${(await Faculty.findById(createdStaffId))!.userId}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'SUSPENDED' });

    expect(suspendRes.status).toBe(200);

    // Login is blocked
    const loginRes = await request(app)
      .post('/api/v1/auth/login')
      .send({
        identifier: createdStaffEmployeeId,
        password: 'SecureStaff@2026',
      });

    expect(loginRes.status).toBe(403);
    expect(loginRes.body.message).toContain('suspended');

    // Prior token access is blocked
    const accessRes = await request(app)
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${staffPermanentToken}`);

    expect(accessRes.status).toBe(403);

    // Reactivate account
    const activateRes = await request(app)
      .patch(`/api/v1/admin/users/${(await Faculty.findById(createdStaffId))!.userId}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'ACTIVE' });

    expect(activateRes.status).toBe(200);
  });

  // TEST 16: Admin can soft-delete (archive) and restore staff
  it('16. Admin can safely archive and restore staff records with historical data preserved', async () => {
    // Soft delete
    const deleteRes = await request(app)
      .delete(`/api/v1/admin/faculty/${createdStaffId}?confirm=true`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ reason: 'Faculty transferred' });

    expect(deleteRes.status).toBe(200);
    expect(deleteRes.body.success).toBe(true);

    const archivedDoc = await Faculty.findById(createdStaffId);
    expect(archivedDoc!.isDeleted).toBe(true);

    // Restore
    const restoreRes = await request(app)
      .post(`/api/v1/admin/faculty/${createdStaffId}/restore`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(restoreRes.status).toBe(200);
    expect(restoreRes.body.success).toBe(true);

    const restoredDoc = await Faculty.findById(createdStaffId);
    expect(restoredDoc!.isDeleted).toBe(false);
  });
});
