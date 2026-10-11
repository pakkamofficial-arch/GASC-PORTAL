# Government College Connect — Deployment & Android Build Guide

---

## 1. Backend Server Deployment (Ubuntu / Linux VPS / AWS / Cloud)

### Step 1: Environment Preparation
```bash
# Update system packages
sudo apt update && sudo apt upgrade -y

# Install Node.js v20+ and PM2
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs mongodb
sudo npm install -g pm2
```

### Step 2: Clone and Build
```bash
git clone <repository_url> /var/www/gasc-connect
cd /var/www/gasc-connect/backend

npm install --production=false
cp .env.example .env

# Edit .env with production credentials, 64-char JWT secrets, and MongoDB URI
nano .env

# Seed initial academic setup
npm run seed

# Build TypeScript to production dist/
npm run build
```

### Step 3: Run with PM2 Process Manager
```bash
pm2 start dist/server.js --name "gasc-api" --instances max --exec-mode cluster
pm2 save
pm2 startup
```

### Step 4: Reverse Proxy via Nginx with SSL (Let's Encrypt)
```nginx
server {
    server_name api.gasckuthalam.edu.in;

    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

---

## 2. Android Mobile Build Instructions (APK / AAB)

### Option A: Cloud Build via EAS (Recommended for Expo)
1. Install EAS CLI:
   ```bash
   npm install -g eas-cli
   ```
2. Log in with your Expo account:
   ```bash
   eas login
   ```
3. Configure project for Android:
   ```bash
   cd mobile
   eas build:configure
   ```
4. Build standalone Android APK (for internal college testing):
   ```bash
   eas build -p android --profile preview
   ```
   *EAS generates an installable `.apk` file that can be distributed directly to students and staff.*

5. Build production Android App Bundle (`.aab` for Google Play Store):
   ```bash
   eas build -p android --profile production
   ```

### Option B: Local Android Build (Android Studio)
1. Prebuild native Android project:
   ```bash
   cd mobile
   npx expo prebuild --platform android
   ```
2. Open the generated `mobile/android` directory in Android Studio.
3. Configure your release keystore in `android/app/build.gradle`.
4. Assemble release APK:
   ```bash
   cd android
   ./gradlew assembleRelease
   ```
   The generated APK will be located at:
   `android/app/build/outputs/apk/release/app-release.apk`

---

## 3. Database Backup & Disaster Recovery (MongoDB)

### Automated Daily Backup Script
Create `/usr/local/bin/backup-gasc-db.sh`:
```bash
#!/bin/bash
BACKUP_DIR="/var/backups/mongodb"
DATE=$(date +%Y%m%d_%H%M%S)
DB_NAME="gasc_portal"

mkdir -p "$BACKUP_DIR"

# Perform mongodump with gzip compression
mongodump --db "$DB_NAME" --gzip --archive="$BACKUP_DIR/${DB_NAME}_backup_${DATE}.gz"

# Retain only last 30 daily backups
find "$BACKUP_DIR" -type f -name "${DB_NAME}_backup_*.gz" -mtime +30 -delete

echo "[$(date)] Backup completed: ${DB_NAME}_backup_${DATE}.gz" >> /var/log/mongodb_backup.log
```

Ensure permissions:
```bash
chmod +x /usr/local/bin/backup-gasc-db.sh
```

Add cron schedule for 02:00 AM daily:
```bash
crontab -e
# Add:
0 2 * * * /usr/local/bin/backup-gasc-db.sh
```

### Database Restore Procedure
To restore the database from a backup archive:
```bash
mongorestore --gzip --archive=/var/backups/mongodb/gasc_portal_backup_<TIMESTAMP>.gz --drop
```

---

## 4. Local Development Quickstart

1. **Start MongoDB:**
   ```bash
   # Ensure local MongoDB is running on port 27017
   mongod --dbpath <data_directory>
   ```

2. **Backend Startup:**
   ```bash
   cd backend
   npm install
   npm run seed    # Populates initial accounts, departments, and sample records
   npm run dev     # Runs ts-node-dev on http://localhost:5000
   ```

3. **Mobile Client Startup:**
   ```bash
   cd mobile
   npm install
   npx expo start -c
   ```
   - Press `a` to open Android Emulator.
   - Scan QR code with Expo Go on a physical Android device on the same local Wi-Fi.

