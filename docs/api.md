# Government College Connect — REST API Documentation

**Base URL:** `/api/v1`  
**Authentication:** Bearer JWT in `Authorization` header (`Authorization: Bearer <access_token>`)

---

## 1. Authentication Domain

### `POST /auth/login`
Authenticates a student, faculty member, or administrator.
- **Rate Limit:** 20 requests per 15 minutes per IP.
- **Request Body:**
  ```json
  {
    "identifier": "23UCS042",
    "password": "Password@123"
  }
  ```
- **Response (200 OK):**
  ```json
  {
    "success": true,
    "message": "Login successful",
    "data": {
      "tokens": {
        "accessToken": "eyJhbGci...",
        "refreshToken": "eyJhbGci..."
      },
      "user": {
        "id": "67...a1",
        "identifier": "23UCS042",
        "role": "STUDENT",
        "status": "ACTIVE"
      },
      "profile": { ... }
    }
  }
  ```

### `POST /auth/refresh`
Rotates refresh tokens and returns fresh access token.
- **Request Body:** `{ "refreshToken": "eyJhb..." }`

### `POST /auth/logout`
Revokes active refresh session.

---

## 2. Student Domain

### `GET /students/dashboard`
Protected: Role `STUDENT` only.
Returns student profile, overall attendance %, subject-wise attendance breakdown, today's timetable periods, recent published assessment marks, pending fees, and announcements.

### `GET /students/attendance`
Returns chronological verified daily attendance history with subject, date, period, and status.

### `GET /students/marks`
Returns all published examination results and university grades.

---

## 3. Attendance Domain

### `GET /attendance/students`
Protected: Role `FACULTY`, `ADMIN`.
- **Query Params:** `departmentId`, `semester`, `section`.
- Returns enrolled students for taking class attendance.

### `POST /attendance/sessions`
Protected: Role `FACULTY`, `ADMIN`.
Creates finalized session and records for every student. Rejects duplicate sessions on same date, period, department, and section.

### `PUT /attendance/records/:recordId`
Protected: Role `FACULTY`, `ADMIN`.
Performs authorized attendance correction.
- **Request Body:**
  ```json
  {
    "status": "PRESENT",
    "reasonForChange": "Medical leave letter verified by HOD"
  }
  ```
- Logs immutable audit record.

---

## 4. Assessments & Marks Domain

### `GET /assessments`
Lists assessments with filters (`departmentId`, `semester`, `subjectId`, `status`).

### `POST /assessments`
Configures a new assessment (title, category: `INTERNAL_TEST`, `ASSIGNMENT`, `SEMINAR`, `PRACTICAL`, `EXTERNAL_EXAM`, maxMarks, passingMarks, deadline).

### `POST /assessments/:id/marks`
Enters student marks. Validates:
- Marks cannot be negative.
- Marks cannot exceed `maxMarks`.
- Supports saving drafts (`submitForApproval: false`) or submitting for review (`submitForApproval: true`).

### `POST /assessments/:id/approve`
Protected: Role `ADMIN`. Approves submitted marks.

### `POST /assessments/:id/publish`
Protected: Role `ADMIN`. Publishes approved marks to students.

---

## 5. Digital ID Card & Certificates Domain

### `GET /idcards/my-card`
Student retrieves their digital identity card and QR verification token.

### `GET /idcards/verify/:token` (Public Endpoint)
Scans QR verification token. Returns institutional verification result (`VALID` / `INVALID`), student details, and validity without exposing private credentials.

### `POST /certificates`
Student submits Bonafide request with purpose (`BUS_PASS`, `SCHOLARSHIP`, `TRAIN_PASS`, `PASSPORT`, `BANK_ACCOUNT`, `EDUCATION_LOAN`, `INTERNSHIP`, `GENERAL`).

### `POST /certificates/:id/approve`
Admin approves request and issues official certificate with unique institutional reference number (`GASC/BONA/YYYY/XXXX`).

### `GET /certificates/:id/download`
Streams server-side generated PDF with Tamil Nadu emblem header, college seal, principal signatory fields, and security verification QR code.

---

## 6. Fees & Payments Domain

### `GET /payments/my-fees`
Student retrieves fee accounts, breakdown, concessions, and outstanding balance.

### `POST /payments/orders`
Creates idempotent payment order. Validates that requested amount does not exceed balance.

### `POST /payments/verify`
Validates transaction, updates account balance, and generates official payment receipt number (`REC/GASC/YYYY/XXXXX`).

---

## 7. AI Study Centre Domain

### `POST /ai/assistant`
Curated academic concept explanations with bilingual Tamil and English support.

### `POST /ai/notes`
Generates structured revision notes with exam strategy and key takeaway points.

### `POST /ai/quiz`
Generates self-assessment multiple-choice questions with answer explanations.

### `POST /ai/career`
Provides Tamil Nadu Public Service Commission (TNPSC), PG entrance, and IT software career roadmaps.

---

## 8. Admin & Audit Domain

### `GET /admin/dashboard`
Returns high-level statistics and recent audit logs.

### `GET /admin/students`
Lists students with search and pagination.

### `PATCH /admin/users/:userId/status`
Toggles account status (`ACTIVE` / `SUSPENDED`). Immediately revokes refresh tokens if suspended.

### `GET /admin/audit-logs`
Returns chronological audit records of mark entries, logins, and approvals.
