import request from 'supertest';
import mongoose from 'mongoose';
import nacl from 'tweetnacl';
import * as naclUtil from 'tweetnacl-util';
import { createApp } from '../src/app';
import { connectDatabase, disconnectDatabase } from '../src/config/database';
import { User, Conversation, ChatMessage } from '../src/models';
import { bootstrapPrimaryAdmin, PRIMARY_ADMIN_IMMUTABLE_ID } from '../src/services/admin-bootstrap.service';
import { ChatService } from '../src/modules/chat/chat.service';
import { CleanupService } from '../src/services/cleanup.service';
import { encryptSymmetric, decryptSymmetric } from '../src/services/e2ee.service';

const app = createApp();

describe('GASC CONNECT — Security, Single Admin, Chat Boundaries & E2EE Verification', () => {
  let adminToken: string;
  let facultyToken: string;
  let studentToken: string;
  let adminUserId: string;
  let facultyUserId: string;
  let studentUserId: string;

  beforeAll(async () => {
    await connectDatabase();
    await User.deleteMany({ identifier: 'ROGUE_ADMIN' });
    await User.syncIndexes();

    // Ensure Primary Admin and Default Groups are initialized
    await bootstrapPrimaryAdmin();
    await ChatService.ensureDefaultGroups();

    // Login Admin
    const adminRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ identifier: 'ADMIN001', password: 'Admin@123' });
    adminToken = adminRes.body?.data?.tokens?.accessToken;
    adminUserId = adminRes.body?.data?.user?.id;

    // Login Faculty
    const facultyRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ identifier: 'FAC-CS-01', password: 'Password@123' });
    facultyToken = facultyRes.body?.data?.tokens?.accessToken;
    facultyUserId = facultyRes.body?.data?.user?.id;

    // Login Student
    const studentRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ identifier: '23UCS042', password: 'Password@123' });
    studentToken = studentRes.body?.data?.tokens?.accessToken;
    studentUserId = studentRes.body?.data?.user?.id;
  });

  afterAll(async () => {
    await disconnectDatabase();
  });

  describe('1. Single Authoritative Primary Administrator Model', () => {
    it('should have exactly one active primary administrator with immutable ID', async () => {
      const primaryAdmins = await User.find({ isPrimaryAdmin: true });
      expect(primaryAdmins.length).toBe(1);
      expect(primaryAdmins[0].adminImmutableId).toBe(PRIMARY_ADMIN_IMMUTABLE_ID);
      expect(primaryAdmins[0].role).toBe('ADMIN');
      expect(primaryAdmins[0].status).toBe('ACTIVE');
    });

    it('should reject creating a second primary administrator at database level via unique partial index', async () => {
      let threwDuplicateError = false;
      try {
        await User.create({
          identifier: 'ROGUE_ADMIN',
          passwordHash: 'dummyHash123',
          role: 'ADMIN',
          isPrimaryAdmin: true,
          adminImmutableId: 'GASC-ROOT-ADM-ROGUE',
          status: 'ACTIVE',
        });
      } catch (err: any) {
        threwDuplicateError = err.code === 11000;
      }
      expect(threwDuplicateError).toBe(true);

      // Verify still only one primary admin
      const count = await User.countDocuments({ isPrimaryAdmin: true });
      expect(count).toBe(1);
    });

    it('should handle concurrent bootstrap calls safely without creating duplicate primary admins', async () => {
      const results = await Promise.all([
        bootstrapPrimaryAdmin(),
        bootstrapPrimaryAdmin(),
        bootstrapPrimaryAdmin(),
      ]);

      expect(results.length).toBe(3);
      const count = await User.countDocuments({ isPrimaryAdmin: true });
      expect(count).toBe(1);
    });

    it('should expose primary administrator status through admin security API', async () => {
      const res = await request(app)
        .get('/api/v1/admin/security/overview')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.primaryAdministrator.enforced).toBe(true);
      expect(res.body.data.primaryAdministrator.immutableId).toBe(PRIMARY_ADMIN_IMMUTABLE_ID);
    });
  });

  describe('2. Authentication & Role-Based Access Enforcement', () => {
    it('should reject unauthenticated access to chat endpoints', async () => {
      const res = await request(app).get('/api/v1/chat/conversations');
      expect(res.status).toBe(401);
    });

    it('should reject student access to administrative security dashboard', async () => {
      const res = await request(app)
        .get('/api/v1/admin/security/overview')
        .set('Authorization', `Bearer ${studentToken}`);

      expect(res.status).toBe(403);
    });

    it('should reject student access to cleanup endpoints', async () => {
      const res = await request(app)
        .post('/api/v1/admin/security/cleanup/execute')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({ dryRun: true });

      expect(res.status).toBe(403);
    });
  });

  describe('3. College Chat Channel Boundaries & Role Isolation', () => {
    it('should allow student to discover whole college and class channels but hide faculty/principal channels', async () => {
      const res = await request(app)
        .get('/api/v1/chat/conversations')
        .set('Authorization', `Bearer ${studentToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      const types = res.body.data.map((c: any) => c.type);

      // Student must see WHOLE_COLLEGE
      expect(types).toContain('WHOLE_COLLEGE');

      // Student must NEVER see FACULTY_ONLY, PRINCIPAL_RESTRICTED, or ADMIN_RESTRICTED
      expect(types).not.toContain('FACULTY_ONLY');
      expect(types).not.toContain('PRINCIPAL_RESTRICTED');
      expect(types).not.toContain('ADMIN_RESTRICTED');
    });

    it('should prevent student from reading messages in faculty-only group even with known ID', async () => {
      const facultyGroup = await Conversation.findOne({ type: 'FACULTY_ONLY' });
      expect(facultyGroup).not.toBeNull();

      const res = await request(app)
        .get(`/api/v1/chat/conversations/${facultyGroup!._id}/messages`)
        .set('Authorization', `Bearer ${studentToken}`);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });

    it('should prevent student from reading messages in principal/admin restricted group', async () => {
      const executiveGroup = await Conversation.findOne({
        type: { $in: ['PRINCIPAL_RESTRICTED', 'ADMIN_RESTRICTED'] },
      });
      expect(executiveGroup).not.toBeNull();

      const res = await request(app)
        .get(`/api/v1/chat/conversations/${executiveGroup!._id}/messages`)
        .set('Authorization', `Bearer ${studentToken}`);

      expect(res.status).toBe(403);
    });

    it('should allow faculty to access faculty-only conversation', async () => {
      const facultyGroup = await Conversation.findOne({ type: 'FACULTY_ONLY' });
      expect(facultyGroup).not.toBeNull();

      const res = await request(app)
        .get(`/api/v1/chat/conversations/${facultyGroup!._id}/messages`)
        .set('Authorization', `Bearer ${facultyToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should allow unified Admin / Principal account to access faculty group and executive restricted group', async () => {
      const executiveGroup = await Conversation.findOne({
        type: { $in: ['PRINCIPAL_RESTRICTED', 'ADMIN_RESTRICTED'] },
      });
      const facultyGroup = await Conversation.findOne({ type: 'FACULTY_ONLY' });

      const execRes = await request(app)
        .get(`/api/v1/chat/conversations/${executiveGroup!._id}/messages`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(execRes.status).toBe(200);

      const facRes = await request(app)
        .get(`/api/v1/chat/conversations/${facultyGroup!._id}/messages`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(facRes.status).toBe(200);
    });
  });

  describe('4. Genuine End-to-End Encryption (E2EE) & Storage Security', () => {
    it('should store only ciphertext and nonce in database, never plaintext', async () => {
      const wholeCollegeGroup = await Conversation.findOne({ type: 'WHOLE_COLLEGE' });
      expect(wholeCollegeGroup).not.toBeNull();

      // Client generates 32-byte symmetric channel key and encrypts secret plaintext
      const symmetricKey = nacl.randomBytes(32);
      const secretPlaintext = 'GASC-CONFIDENTIAL-EXAM-SCHEDULE-2026';
      const encrypted = encryptSymmetric(secretPlaintext, symmetricKey);

      // Post encrypted payload to API
      const postRes = await request(app)
        .post(`/api/v1/chat/conversations/${wholeCollegeGroup!._id}/messages`)
        .set('Authorization', `Bearer ${facultyToken}`)
        .send({
          ciphertext: encrypted.ciphertext,
          nonce: encrypted.nonce,
          keyVersion: 1,
        });

      expect(postRes.status).toBe(201);
      expect(postRes.body.success).toBe(true);
      const messageId = postRes.body.data._id;

      // Direct inspection of MongoDB record
      const dbMessage = await ChatMessage.findById(messageId).lean();
      expect(dbMessage).not.toBeNull();
      expect(dbMessage!.ciphertext).toBe(encrypted.ciphertext);
      expect(dbMessage!.nonce).toBe(encrypted.nonce);

      // The plaintext string must NEVER appear anywhere in the database record
      expect(JSON.stringify(dbMessage)).not.toContain(secretPlaintext);

      // Client with valid symmetric key can decrypt accurately
      const decrypted = decryptSymmetric(dbMessage!.ciphertext, dbMessage!.nonce, symmetricKey);
      expect(decrypted).toBe(secretPlaintext);

      // Unauthorized client with wrong key cannot decrypt
      const wrongKey = nacl.randomBytes(32);
      const failedDecrypted = decryptSymmetric(dbMessage!.ciphertext, dbMessage!.nonce, wrongKey);
      expect(failedDecrypted).toBeNull();
    });

    it('should reject message posting with invalid cryptographic nonces', async () => {
      const wholeCollegeGroup = await Conversation.findOne({ type: 'WHOLE_COLLEGE' });

      const res = await request(app)
        .post(`/api/v1/chat/conversations/${wholeCollegeGroup!._id}/messages`)
        .set('Authorization', `Bearer ${facultyToken}`)
        .send({
          ciphertext: 'dGVzdA==',
          nonce: 'invalid-short-nonce', // Invalid nonce
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should register and retrieve user E2EE public keys', async () => {
      const keyPair = nacl.box.keyPair();
      const pubKeyBase64 = naclUtil.encodeBase64(keyPair.publicKey);

      // Register public key
      const regRes = await request(app)
        .post('/api/v1/chat/public-key')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({ publicKey: pubKeyBase64 });

      expect(regRes.status).toBe(200);

      // Retrieve public key
      const getRes = await request(app)
        .get(`/api/v1/chat/users/${studentUserId}/public-key`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(getRes.status).toBe(200);
      expect(getRes.body.data.e2eePublicKey).toBe(pubKeyBase64);
    });
  });

  describe('5. Data Cleanup Dry-Run & Preservation Safeguards', () => {
    it('should run cleanup dry-run and identify demo records without modifying database', async () => {
      const res = await request(app)
        .get('/api/v1/admin/security/cleanup/inventory')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.preservedAdminCount).toBe(1);
      expect(res.body.data.preservedPrimaryAdminId).toBe(PRIMARY_ADMIN_IMMUTABLE_ID);
      expect(res.body.data.demoUsersCount).toBeGreaterThan(0);
    });

    it('should preserve primary admin when cleanup service is invoked', async () => {
      const dryResult = await CleanupService.performCleanup(true);
      expect(dryResult.dryRun).toBe(true);
      expect(dryResult.inventory.preservedPrimaryAdminId).toBe(PRIMARY_ADMIN_IMMUTABLE_ID);

      // Verify primary admin remains intact
      const admin = await User.findOne({ isPrimaryAdmin: true });
      expect(admin).not.toBeNull();
      expect(admin!.adminImmutableId).toBe(PRIMARY_ADMIN_IMMUTABLE_ID);
    });
  });
});
