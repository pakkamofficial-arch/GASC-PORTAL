# Security & Authorization Audit Report

**Application:** Government College Connect  
**Institution:** Government Arts and Science College, Kuthalam, Mayiladuthurai District, Tamil Nadu  
**Assessment Target:** Backend APIs, Mobile Client, Database Schemas, Authentication & Access Control  
**Auditor:** Senior Security Engineer / Full-Stack Architect  
**Status:** All Critical Vulnerabilities Remediated  

---

## 1. Executive Summary

This security audit certifies the hardening of the Government College Connect application. Historical architectural defects identified in the legacy Government College Management System (GCMS) web portal—specifically client-side role reliance, development authentication bypasses (`req.user = mockUser`), missing object-level authorization, and unvalidated mark boundaries—have been completely eliminated and replaced with defense-in-depth security controls.

---

## 2. Legacy GCMS Defect Remediation Audit

| Legacy GCMS Vulnerability | Risk Level | Remediation Implemented in GCC | Verification |
| :--- | :--- | :--- | :--- |
| **Development Auth Bypass Fallback** (`req.user = mockAdmin`) | **CRITICAL** | Completely removed. Every route protected with `authenticate` middleware strictly requires a valid, cryptographically verified RS256/HS256 JWT bearer token. Requests without valid tokens immediately receive `401 Unauthorized`. | Verified by test case `AUTH-04` & unauthenticated route tests. |
| **Client-Supplied Role Trust** | **HIGH** | Role claims supplied in request bodies or query parameters are ignored. User roles are resolved strictly from verified database records and signed JWT claims. | Verified by RBAC middleware tests `AUTH-05` & `AUTH-06`. |
| **Unbounded Marks Submission** | **MEDIUM** | Dynamic validation checks entered marks against `maxMarks` defined in the assessment schema (`marksObtained <= maxMarks` and `>= 0`). Negative and oversized values are rejected at controller boundary. | Verified by test case `ACAD-03`. |
| **Attendance Duplicate Collisions** | **MEDIUM** | MongoDB compound unique index `{ departmentId, semester, section, subjectId, date, period }` enforces period-level uniqueness at the storage engine level. | Verified by test case `ATT-01`. |
| **Sensitive Data in QR Codes** | **HIGH** | Student personal data (Aadhaar, address, phone) is never embedded into ID card QR codes. Instead, an opaque, high-entropy cryptographic token (`crypto.randomBytes(24).toString('hex')`) is encoded. The verification endpoint exposes only public academic credentials. | Verified by test case `CERT-02`. |
| **Unprotected Certificate Generation** | **HIGH** | Bonafide and Conduct certificates can only be approved and stamped by authenticated administrators. Generated PDF streams include verifiable certificate reference numbers. | Verified by test case `CERT-01`. |
| **AI Secret Leakage in Mobile Bundle** | **HIGH** | Third-party AI provider keys (Groq, Gemini, OpenRouter) are kept strictly on the server side in `.env`. The mobile client interacts exclusively with the backend `/api/v1/ai` proxy. | Verified by code audit of mobile bundle. |

---

## 3. Core Security Controls Implemented

### 3.1 Authentication & Session Management
1. **Password Hashing:**
   - User passwords are salted and hashed using `bcrypt` (10 rounds). Plaintext passwords are never logged or persisted.
2. **Dual-Token Architecture:**
   - **Access Token:** Short-lived JWT (15 minutes expiry) containing `userId` and `role`.
   - **Refresh Token:** Stored in database, rotated upon refresh request.
   - Mobile client maintains tokens in secure storage; auto-renews access tokens transparently via `POST /api/v1/auth/refresh`.
3. **Login Rate Limiting:**
   - Express rate-limiter prevents brute-force credential stuffing on `/api/v1/auth/login`.

### 3.2 Role-Based Access Control (RBAC) & Object Authorization
- **STUDENT:**
  - Can only view their own profile, timetable, enrolled attendance, published marks, assignments, and study materials.
  - Can submit coursework solutions and request certificates.
  - Cannot access any administrative endpoints (`/api/v1/admin/*`, `/api/v1/reports/*`).
- **FACULTY:**
  - Can enter attendance and internal marks only for classes and subjects officially assigned to their profile.
  - Can create assignments and evaluate submissions for allocated batches.
  - Can apply for staff leave and upload study materials.
  - Cannot publish institution-wide final results or approve certificate issues.
- **ADMINISTRATOR (Principal's Office):**
  - Full management of student enrollments, faculty profiles, and departmental assignments.
  - Final authority on certificate approvals and result publication.
  - Access to immutable audit logs and institutional NAAC/NIRF reporting.

### 3.3 Audit Logging & Non-Repudiation
- Sensitive state mutations trigger an audit log record in MongoDB (`AuditLog` collection):
  - Action identifier (`MARKS_ENTERED`, `ATTENDANCE_RECORDED`, `CERTIFICATE_APPROVED`, `LEAVE_REQUESTED`, `PASSWORD_RESET`, etc.)
  - Performed by `userId` and role
  - Target entity type and ID
  - Client IP address and timestamp
  - Audit trail is tamper-evident and visible only to administrators.

### 3.4 Data Validation & Sanitization
- All incoming payloads are strictly validated using `Zod` schemas before hitting service controllers.
- MongoDB queries use parameterized object lookups to protect against NoSQL injection.
- Security headers configured via `helmet` middleware.
- CORS origins restricted to authorized college hostnames.

---

## 4. Remaining External Prerequisites & Production Hardening

Before deploying to production servers, institutional authorities must supply the following:

1. **Official Payment Gateway Credentials:**
   - Razorpay / BillDesk / SBI ePay Key ID, Secret, and Webhook Signing Secret. Current test runs utilize verified sandbox order creation.
2. **Institutional SMS Gateway:**
   - DLT-registered SMS gateway credentials (e.g. CDAC / NIC / BSNL SMS Gateway) for OTP-based password resets if required by college policy.
3. **Domain SSL Certificates:**
   - TLS 1.3 certificates (Let's Encrypt or Sectigo) configured on the college domain (`portal.gasckuthalam.edu.in`).
4. **Institutional Approval for Automated Data Imports:**
   - Official CSV/Excel dumps of enrolled students from the Annamalai University portal must be signed by the Principal before batch ingestion.
