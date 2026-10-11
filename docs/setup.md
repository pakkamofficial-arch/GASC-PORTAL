# Government College Connect — Setup & Installation Guide

**Institution:** Government Arts and Science College, Kuthalam, Mayiladuthurai District, Tamil Nadu  
**Affiliation:** Annamalai University  
**Application:** Government College Connect  

---

## 1. Prerequisites

- **Node.js:** v18.0.0 or higher (Tested on Node v22.x)
- **MongoDB:** v6.0 or higher running locally on default port `27017` or MongoDB Atlas URI
- **Mobile Development Tools:**
  - Expo CLI (`npx expo`)
  - Expo Go mobile app (Android / iOS) OR Android Studio with Android SDK (API 34+)

---

## 2. Backend Setup

1. **Navigate to the backend directory:**
   ```bash
   cd backend
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure Environment Variables:**
   Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```
   Verify settings:
   - `PORT=5000`
   - `MONGODB_URI=mongodb://127.0.0.1:27017/gasc_portal`
   - `JWT_ACCESS_SECRET` & `JWT_REFRESH_SECRET`
   - `COLLEGE_NAME="Government Arts and Science College, Kuthalam"`

4. **Seed Database with Demo College Data:**
   Run the seeding script to initialize departments, courses, subjects, timetables, and demo accounts:
   ```bash
   npm run seed
   ```

5. **Run Integration Tests:**
   Execute Jest integration tests:
   ```bash
   npm test
   ```

6. **Start Backend Server:**
   ```bash
   # Development mode with hot-reloading
   npm run dev

   # Or production build & start
   npm run build
   npm start
   ```
   The backend API will be live at `http://localhost:5000/api/v1` (Health check at `http://localhost:5000/health`).

---

## 3. Mobile App Setup

1. **Navigate to the mobile directory:**
   ```bash
   cd mobile
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Start the Mobile Application:**
   ```bash
   # Start Expo development server
   npx expo start
   ```

4. **Running on Android Device / Emulator:**
   - **Android Emulator:** Press `a` in the terminal or run `npx expo start --android`.
     - *Note:* The API client automatically maps `http://10.0.2.2:5000/api/v1` for the Android emulator.
   - **Physical Android Phone:**
     1. Install **Expo Go** from Google Play Store.
     2. Scan the QR code displayed in the terminal.
     3. Ensure phone and development machine are connected to the same Wi-Fi network.

---

## 4. Test Accounts

| Role | Identifier / College ID | Password | Profile Name |
|---|---|---|---|
| **Student** | `23UCS042` | `Password@123` | Murugan K (B.Sc CS, Sem 4, Sec A) |
| **Faculty** | `FAC-CS-01` | `Password@123` | Dr. S. Sundaram (HOD, Computer Science) |
| **Administrator** | `ADMIN001` | `Admin@123` | Institutional Administrator |
