# Government College Connect (அரசு கலை மற்றும் அறிவியல் கல்லூரி, குத்தாலம்)

An end-to-end, functional, human-centred collegiate management mobile and backend platform built for **Government Arts and Science College, Kuthalam, Mayiladuthurai District, Tamil Nadu** (Affiliated with Annamalai University).

---

## 🏛️ Project Overview

**Government College Connect** is a production-grade Android and full-stack software system catering to four distinct institutional user roles:

1. **Student** — Personalized period-wise attendance analytics, university published marks, weekly timetable, verified Digital Student ID Card with QR authenticity tokens, Bonafide certificate requests with PDF generation, fee breakdown with sandbox payment orders, confidential grievance submission, and AI Study Centre.
2. **Faculty / Staff** — Assigned subject portfolio, lecture schedules, daily 5-period roll call attendance register with duplicate prevention & authorized corrections with reason, continuous internal assessment (CIA) marks entry with max-marks validation, draft saving, administrative approval submissions, and new student admission registration.
3. **Head of Department (HOD)** — Departmental supervisory workspace with real-time aggregated metrics (students, faculty, active classes, scheduled/conducted periods, shortages count), faculty workload ledger, timetable scheduling with automated clash detection (preventing faculty double-booking), attendance shortage watch (<75%) with guardian contacts, and class-wise attendance roll-call audits.
4. **Institutional Administrator (Principal's Office)** — Comprehensive student directory with search, filtering, and account status toggling (Active / Suspended), controlled academic promotion workflow preserving historical journey (`StudentAcademicHistory`), bulk student ingestion with row-by-row validation error reports, Bonafide request reviews & official certificate issuance, marks publication to students, class in-charge assignments, fee management, document templates, and audit logging.

---

## 🎓 Academic Hierarchy & Dynamic Database Models

The institutional structure is modeled with dynamic database schemas without hardcoding:

- **Departments (5):**
  - Computer Science (`CS`)
  - English (`ENG`)
  - Tamil (`TAM`)
  - Mathematics (`MATH`)
  - Commerce (`COMM`)
- **Courses (5):**
  - B.Sc. Computer Science (`CS01`)
  - B.A. English (`ENG01`)
  - B.A. Tamil (`TAM01`)
  - B.Sc. Mathematics (`MAT01`)
  - B.Com. Commerce (`COM01`)
- **Batches (`AcademicBatch`):**
  - Track cohorts (e.g., 2024–2027, 2023–2026, 2022–2025) per course with start/end years and active status.
- **Year-Level Classes (15 Classes = 5 Courses × 3 Years):**
  - Auto-grouped with sections (A, B) and linked to `courseId`, `batchId`, `academicYear`, and designated `classInChargeFacultyId`.
- **Academic Progression History (`StudentAcademicHistory`):**
  - Immutable historical ledger recording each student's previous classes, years, semesters, academic years, sections, and promotion dates.

---

## 🎨 Human-Centred Design System

Designed for Tamil Nadu state collegiate institutions adhering to WCAG AA accessibility standards:
- **Primary Dark Green:** `#176B3A`
- **Secondary Green:** `#2E7D4F`
- **Light Mint Background:** `#F1F8F1`
- **Surface:** `#FFFFFF`
- **Text:** `#202820`
- **Border:** `#DCE7DC`
- **Success:** `#1B8A46` | **Warning:** `#C88308` | **Error:** `#D32F2F`

---

## 📦 Technology Stack

- **Mobile:** React Native, Expo SDK 57, TypeScript, React Navigation Native Stack
- **Backend:** Node.js, Express, TypeScript, tsx
- **Database:** MongoDB with Mongoose (relational indexing, validation, and schema constraints)
- **Security:** Bcrypt password hashing (12 rounds), short-lived JWT access tokens (15m), refresh token rotation (7d), rate limiters, Helmet headers, student record privacy isolation
- **PDF Generation:** Server-side PDFKit with embedded QR codes for official Bonafide certificates
- **Testing:** Jest with Supertest integration test suite (**39 / 39 passed automated integration tests**)

---

## 🚀 Quick Start Guide

### 1. Prerequisites
- Node.js v18+
- MongoDB running on `mongodb://127.0.0.1:27017`

### 2. Backend Setup
```bash
cd backend
npm install
cp .env.example .env
npm run seed       # Seeds realistic college data, 15 classes, batches, HOD links & demo accounts
npm test           # Executes the 39 integration tests (100% pass rate)
npm run build      # Verifies TypeScript production build
npm run dev        # Launches server on http://localhost:5000
```

### 3. Mobile App Setup
```bash
cd mobile
npm install
npx tsc --noEmit   # Verifies TypeScript compilation (0 errors)
npx expo start
```
- Press `a` to run on Android Emulator (auto-configured for `10.0.2.2:5000`).
- Or scan QR code with **Expo Go** on your physical Android phone.

---

## 🔑 Pre-seeded Test Accounts

| Role | Login Identifier | Password | Name / Designation | Notes |
|---|---|---|---|---|
| **Student (Active)** | `23UCS042` | `Password@123` | Murugan K | B.Sc CS, Year 2 (Sem 3), Sec A |
| **Student (Unactivated)** | `24UCS099` | DOB: `2006-08-12` | Aravind Kumar | First-time DOB onboarding flow |
| **Faculty** | `FAC-CS-02` | `Password@123` | Dr. T. Murugesan | Assistant Professor, CS |
| **HOD** | `FAC-CS-01` | `Password@123` | Dr. S. Sundaram | Associate Professor & HOD, CS |
| **Administrator** | `ADMIN001` | `Admin@123` | Principal Office | Principal Office Administrator |

---

## 📁 Repository Structure

```text
Gasc App/
├── backend/
│   ├── src/
│   │   ├── config/              # Environment config & database connection
│   │   ├── middleware/          # JWT auth, RBAC, error handler, rate limiters, audit
│   │   ├── models/              # AcademicHierarchy, Profiles, AcademicBatch, StudentAcademicHistory
│   │   ├── modules/
│   │   │   ├── auth/            # Login, token rotation, first-time verified onboarding
│   │   │   ├── academic/        # Departments, Courses, Batches, Classes, Subjects CRUD
│   │   │   ├── hod/             # HOD dashboard metrics, allocations, clash check, shortage watch
│   │   │   ├── students/        # Student dashboard, admissions, promotion, bulk import, history
│   │   │   ├── faculty/         # Faculty dashboard, assigned classes, portfolio
│   │   │   ├── admin/           # Admin dashboard, students directory, faculty, audit
│   │   │   ├── attendance/      # 5-period roll call, duplicate prevention, reports with privacy
│   │   │   ├── assessments/     # Internal marks, validation, approval, publication
│   │   │   ├── timetable/       # Timetable slots with clash detection & events
│   │   │   ├── certificates/    # Bonafide requests & server-side PDF generation
│   │   │   ├── idcards/         # Digital ID cards & QR token verification
│   │   │   ├── payments/        # Fee structures, sandbox orders, verification
│   │   │   ├── assignments/     # Assignments & submissions
│   │   │   ├── quizzes/         # Quizzes with masked answer keys & instant review
│   │   │   ├── ai/              # AI Study assistant, notes & quiz generator
│   │   │   ├── notices/         # Circulars & announcements
│   │   │   └── reports/         # Department & academic analytics
│   │   ├── app.ts               # Express application
│   │   ├── server.ts            # Server entrypoint
│   │   └── seed.ts              # Institutional database seeder (15 classes, batches, HODs)
│   ├── tests/
│   │   └── api.test.ts          # 39 automated integration tests covering all critical flows
│   ├── .env.example
│   └── package.json
├── mobile/
│   ├── src/
│   │   ├── components/          # Header, Button, Card, Badge, Input, StatCard, SectionHeader
│   │   ├── context/             # AuthContext session provider
│   │   ├── navigation/          # Role-based RootNavigator (Student, Faculty, HOD, Admin)
│   │   ├── screens/
│   │   │   ├── auth/            # LoginScreen, ActivateAccountScreen
│   │   │   ├── student/         # Dashboard, Attendance, Marks, ID Card, Bonafide, Fees, AI
│   │   │   ├── faculty/         # Dashboard, Attendance Register, Marks Entry, StudentAdmission
│   │   │   ├── hod/             # HODDashboard, HODFacultyAssignments, HODShortages, HODAttendanceReports
│   │   │   ├── admin/           # Dashboard, AdminStudents (with details, promotion, bulk import), Classes
│   │   │   └── common/          # NoticesScreen, EventsCalendarScreen
│   │   ├── services/            # API client with token interception
│   │   ├── theme/               # Government College palette & typography
│   │   └── types/               # TypeScript interfaces
│   ├── App.tsx                  # Mobile root entrypoint
│   ├── app.json                 # Expo configuration
│   └── package.json
├── docs/
│   ├── setup.md                 # Step-by-step setup guide
│   ├── api.md                   # Complete REST API reference
│   ├── security.md              # Security & production-readiness checklist
│   └── deployment.md            # Production deployment & Android APK build guide
└── README.md
```

---

## 🧪 Automated Integration Test Verification

The comprehensive test suite in `backend/tests/api.test.ts` validates 39 real integration scenarios:

- **Auth & Access Control:** Student, faculty, HOD, and admin login; invalid credentials rejection; RBAC route protection.
- **Academic Hierarchy:** Structure overview of 5 courses, 15 classes, and vacant class in-charge assignments.
- **Registration & Class Grouping:** Student admission with duplicate roll number rejection and automatic class grouping.
- **Controlled Promotion:** Promotion advancing year, semester, and academic year while archiving past `StudentAcademicHistory`.
- **Bulk Ingestion:** Ingestion with row-by-row error reporting (row numbers, register numbers, and failure reasons).
- **HOD Supervisory Engine:** Aggregated real metrics for HOD department; shortage lists (<75%); timetable clash rejection (409 Conflict).
- **Attendance & Privacy Isolation:** Student period-wise attendance report; strict isolation preventing students from accessing other students' records; faculty class-wise report generation.

```text
Test Suites: 1 passed, 1 total
Tests:       39 passed, 39 total
Snapshots:   0 total
Time:        18.982 s
Result:      100% PASS RATE
```

## 👨‍💻 Developer Credit

**Developed by Abishek Shanmugavadivel**  
Government College Connect (GASC Connect) for Government Arts and Science College, Kuthalam.
