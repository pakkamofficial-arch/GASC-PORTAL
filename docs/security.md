# Government College Connect — Security & Production Readiness Checklist

**Institution:** Government Arts and Science College, Kuthalam  

---

## 1. Authentication & Token Architecture
- [x] **Secure Password Hashing:** Salted bcrypt hashing with 12 rounds on all stored passwords. Plaintext passwords never stored or logged.
- [x] **Short-lived Access Tokens:** Access tokens expire after 15 minutes.
- [x] **Refresh Token Rotation:** Refresh tokens stored securely; revoked upon rotation or account suspension.
- [x] **Role Resolution from Database:** User roles strictly resolved from trusted MongoDB records on every authenticated request; never accepted from client payloads.
- [x] **Account Status Verification:** Suspended or inactive accounts are rejected by middleware on every call.

---

## 2. Authorization & Data Isolation
- [x] **Object-Level Authorization:** Students can only fetch their own attendance, marks, certificates, and fees. Attempts to access other students' records are blocked with HTTP 403 Forbidden.
- [x] **Faculty Boundaries:** Faculty members can only mark attendance and enter marks for subjects and classes they are officially assigned to teach.
- [x] **Administrative Privilege Safeguards:** Administrator accounts cannot be self-registered. Admin creation is strictly restricted to secure initialization.

---

## 3. Network & Transport Security
- [x] **Helmet HTTP Headers:** X-Frame-Options, DNS Prefetch Control, X-Content-Type-Options enabled via `helmet`.
- [x] **CORS Configuration:** Configured to whitelist trusted origins in production.
- [x] **Rate Limiting:**
  - Login attempts limited to 20 requests per 15 minutes per IP.
  - Password recovery requests limited to 5 per hour.
  - General API limited to prevent Denial of Service (DoS).

---

## 4. Financial & Payment Integrity
- [x] **Idempotent Payment Processing:** Payments use unique idempotency keys to prevent duplicate deductions.
- [x] **Server-side Balance Calculation:** Amounts due are calculated server-side; client cannot manipulate fee totals.
- [x] **Prohibited Credential Exclusion:** Card numbers, PINs, and CVVs are never handled or stored.

---

## 5. Audit Logging & Non-repudiation
- [x] **Tamper-evident Audit Logs:** All sensitive actions (marks entry, attendance corrections, certificate approvals, and account status changes) log the operator user ID, IP address, timestamp, and before/after state into the `AuditLog` collection.

---

## 6. AI Safety & Privacy
- [x] **Isolation from Official Records:** AI services cannot read private student records or alter attendance, marks, certificates, or fee balances.
- [x] **Graceful Fallback:** If external AI keys (`GEMINI_API_KEY`) are unconfigured, system falls back gracefully to built-in academic syllabi without throwing unhandled exceptions.
