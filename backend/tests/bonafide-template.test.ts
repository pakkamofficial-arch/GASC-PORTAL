import request from 'supertest';
import fs from 'fs';
import path from 'path';
import PizZip from 'pizzip';
import { createApp } from '../src/app';
import { connectDatabase, disconnectDatabase } from '../src/config/database';
import { BonafideRequest, Student, User } from '../src/models';
import { generateBonafideDocxBuffer } from '../src/modules/certificates/bonafide.service';

const app = createApp();

describe('Bonafide Certificate Authentic Template Workflow', () => {
  let studentToken: string;
  let otherStudentToken: string;
  let adminToken: string;
  let approvedCertId: string;
  let pendingCertId: string;
  let verifiedStudent: any;

  const templatePath = path.resolve(__dirname, '../templates/bonafide-template.docx');

  beforeAll(async () => {
    await connectDatabase();
    // 1. Login as Student
    const studentLogin = await request(app)
      .post('/api/v1/auth/login')
      .send({ identifier: '23UCS042', password: 'Password@123' });
    studentToken = studentLogin.body.data.tokens.accessToken;

    // 2. Login as Admin
    const adminLogin = await request(app)
      .post('/api/v1/auth/login')
      .send({ identifier: 'ADMIN001', password: 'Admin@123' });
    adminToken = adminLogin.body.data.tokens.accessToken;

    // 3. Login as another student (e.g. 23UMA015) for isolation testing
    const otherLogin = await request(app)
      .post('/api/v1/auth/login')
      .send({ identifier: '23UMA015', password: 'Password@123' });
    otherStudentToken = otherLogin.body.data?.tokens?.accessToken;

    // Retrieve verified student record
    verifiedStudent = await Student.findOne({ registerNo: '23UCS042' });

    // Retrieve an approved certificate for 23UCS042
    let approved = await BonafideRequest.findOne({
      studentId: verifiedStudent._id,
      status: 'APPROVED',
    });

    if (!approved) {
      approved = await BonafideRequest.create({
        studentId: verifiedStudent._id,
        purpose: 'SCHOLARSHIP',
        academicYear: '2023-2026',
        status: 'APPROVED',
        certificateNumber: 'GASC/BONA/2026/0001',
        approvedAt: new Date(),
        issuedAt: new Date(),
      });
    }
    approvedCertId = approved._id.toString();

    // Create a pending request to verify unapproved access block
    const pending = await BonafideRequest.create({
      studentId: verifiedStudent._id,
      purpose: 'BANK_ACCOUNT',
      academicYear: '2023-2026',
      status: 'SUBMITTED',
    });
    pendingCertId = pending._id.toString();
  });

  describe('1. Template File Integrity', () => {
    it('official bonafide-template.docx exists and is not empty', () => {
      expect(fs.existsSync(templatePath)).toBe(true);
      const stats = fs.statSync(templatePath);
      expect(stats.size).toBeGreaterThan(10000);
    });

    it('template contains the institutional headings and signature areas', () => {
      const buffer = fs.readFileSync(templatePath);
      const zip = new PizZip(buffer);
      const xml = zip.file('word/document.xml')?.asText() || '';

      expect(xml).toContain('GOVERNMENT ARTS &amp; SCIENCE COLLEGE');
      expect(xml).toContain('Kuthalam');
      expect(xml).toContain('BONAFIDE/COURSE/CONDUCT CERTIFICATE');
      expect(xml).toContain('Signatutre');
      expect(xml).toContain('Head of the Department');
      expect(xml).toContain('Principal');
    });
  });

  describe('2. In-Memory DOCX Generation', () => {
    it('generates a separate copy of DOCX without mutating the source template file', async () => {
      const initialModTime = fs.statSync(templatePath).mtimeMs;

      const generated = await generateBonafideDocxBuffer({
        certificateNo: 'GASC/BONA/2026/0001',
        studentName: 'KAVITHA S',
        registerNo: '23UCS042',
        className: 'III B.Sc Computer Science',
        academicYear: '2023-2026',
        shift: 'Shift I (Regular)',
        conduct: 'GOOD',
        purpose: 'SCHOLARSHIP',
        issueDate: '11/10/2026',
      });

      // Verify template file was not touched
      const afterModTime = fs.statSync(templatePath).mtimeMs;
      expect(afterModTime).toBe(initialModTime);

      expect(Buffer.isBuffer(generated)).toBe(true);
      expect(generated.length).toBeGreaterThan(8000);

      // Verify generated XML contents
      const zip = new PizZip(generated);
      const xml = zip.file('word/document.xml')?.asText() || '';

      expect(xml).toContain('This is Certify that KAVITHA S');
      expect(xml).toContain('23UCS042');
      expect(xml).toContain('III B.Sc Computer Science');
      expect(xml).toContain('2023');
      expect(xml).toContain('2026');
      expect(xml).toContain('Shift I (Regular)');
      expect(xml).toContain('GOOD');
      expect(xml).toContain('Post-Matric Scholarship');
      expect(xml).toContain('Principal');
    });
  });

  describe('3. API Security & Format Delivery', () => {
    it('serves authentic DOCX when requested with ?format=docx', async () => {
      const res = await request(app)
        .get(`/api/v1/certificates/${approvedCertId}/download?format=docx`)
        .set('Authorization', `Bearer ${studentToken}`);

      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toBe(
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      );
      expect(res.headers['content-disposition']).toContain('Bonafide_23UCS042.docx');
      expect(Number(res.headers['content-length'])).toBeGreaterThan(8000);
    });

    it('serves authentic DOCX via dedicated /download-docx endpoint', async () => {
      const res = await request(app)
        .get(`/api/v1/certificates/${approvedCertId}/download-docx`)
        .set('Authorization', `Bearer ${studentToken}`);

      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toBe(
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      );
      expect(res.headers['content-disposition']).toContain('.docx');
    });

    it('serves PDF copy when requested with default /download for compatibility', async () => {
      const res = await request(app)
        .get(`/api/v1/certificates/${approvedCertId}/download`)
        .set('Authorization', `Bearer ${studentToken}`);

      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toBe('application/pdf');
    });

    it('prohibits downloading unapproved certificates', async () => {
      const res = await request(app)
        .get(`/api/v1/certificates/${pendingCertId}/download-docx`)
        .set('Authorization', `Bearer ${studentToken}`);

      expect(res.status).toBe(403);
      expect(res.body.message).toContain('Certificate has not been approved yet');
    });

    it('prohibits one student from downloading another student certificate', async () => {
      if (otherStudentToken) {
        const res = await request(app)
          .get(`/api/v1/certificates/${approvedCertId}/download-docx`)
          .set('Authorization', `Bearer ${otherStudentToken}`);

        expect(res.status).toBe(403);
        expect(res.body.message).toContain('not authorized to view another student certificate');
      }
    });

    it('allows college administrators to download approved certificates for office verification', async () => {
      const res = await request(app)
        .get(`/api/v1/certificates/${approvedCertId}/download-docx`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toBe(
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      );
    });
  });

  afterAll(async () => {
    await disconnectDatabase();
  });
});

