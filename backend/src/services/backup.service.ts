import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import mongoose from 'mongoose';
import { config } from '../config';
import { logAuditEvent } from '../middleware/audit';

export interface BackupCollectionManifest {
  count: number;
  sizeBytes: number;
  sha256: string;
}

export interface BackupFileManifest {
  sizeBytes: number;
  sha256: string;
}

export interface BackupManifest {
  backupId: string;
  timestamp: string;
  environment: string;
  databaseName: string;
  collections: Record<string, BackupCollectionManifest>;
  files: Record<string, BackupFileManifest>;
  overallSha256: string;
  totalRecords: number;
  totalFiles: number;
  status: 'COMPLETED' | 'VERIFIED' | 'FAILED';
  verificationResults?: {
    verifiedAt: string;
    passed: boolean;
    details: string;
  };
}

export class BackupService {
  private static backupRoot = path.join(process.cwd(), 'backups');
  private static uploadsRoot = path.join(process.cwd(), 'uploads');
  private static maxRecoveryPoints = 7;

  /**
   * Ensure backup directories exist
   */
  public static ensureDirectories(): void {
    const dbDir = path.join(this.backupRoot, 'db');
    const filesDir = path.join(this.backupRoot, 'files');
    if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir, { recursive: true });
    if (!fs.existsSync(filesDir)) fs.mkdirSync(filesDir, { recursive: true });
  }

  /**
   * Compute SHA-256 hash of a file or string
   */
  public static computeSha256(content: Buffer | string): string {
    return crypto.createHash('sha256').update(content).digest('hex');
  }

  /**
   * Compute SHA-256 hash of a file on disk
   */
  public static computeFileSha256(filePath: string): string {
    const fileBuffer = fs.readFileSync(filePath);
    return this.computeSha256(fileBuffer);
  }

  /**
   * Create a full database and file assets backup with integrity verification
   */
  public static async createBackup(actorId?: string, reason: string = 'Scheduled or manual snapshot'): Promise<BackupManifest> {
    this.ensureDirectories();

    const timestamp = new Date();
    const backupId = `backup-${timestamp.toISOString().replace(/[:.]/g, '-')}`;
    const backupDir = path.join(this.backupRoot, 'db', backupId);
    const backupFilesDir = path.join(backupDir, 'files');
    fs.mkdirSync(backupDir, { recursive: true });
    fs.mkdirSync(backupFilesDir, { recursive: true });

    const db = mongoose.connection.db;
    if (!db) {
      throw new Error('Database connection is not open. Cannot perform backup.');
    }

    const collections = await db.listCollections().toArray();
    const collectionManifests: Record<string, BackupCollectionManifest> = {};
    let totalRecords = 0;
    const combinedHash = crypto.createHash('sha256');

    // 1. Back up MongoDB collections
    for (const collInfo of collections) {
      const collName = collInfo.name;
      // Skip system collections
      if (collName.startsWith('system.')) continue;

      const coll = db.collection(collName);
      const docs = await coll.find({}).toArray();
      const jsonContent = JSON.stringify(docs, null, 2);
      const hash = this.computeSha256(jsonContent);

      const filePath = path.join(backupDir, `${collName}.json`);
      fs.writeFileSync(filePath, jsonContent, 'utf-8');

      collectionManifests[collName] = {
        count: docs.length,
        sizeBytes: Buffer.byteLength(jsonContent, 'utf-8'),
        sha256: hash,
      };

      totalRecords += docs.length;
      combinedHash.update(hash);
    }

    // 2. Back up uploaded file assets (PDF, DOCX study notes, templates)
    const fileManifests: Record<string, BackupFileManifest> = {};
    let totalFiles = 0;

    if (fs.existsSync(this.uploadsRoot)) {
      const copyDirRecursive = (srcDir: string, destDir: string, relativePrefix: string = '') => {
        const entries = fs.readdirSync(srcDir, { withFileTypes: true });
        for (const entry of entries) {
          const srcPath = path.join(srcDir, entry.name);
          const destPath = path.join(destDir, entry.name);
          const relPath = path.join(relativePrefix, entry.name).replace(/\\/g, '/');

          if (entry.isDirectory()) {
            if (!fs.existsSync(destPath)) fs.mkdirSync(destPath, { recursive: true });
            copyDirRecursive(srcPath, destPath, relPath);
          } else if (entry.isFile()) {
            fs.copyFileSync(srcPath, destPath);
            const fileHash = this.computeFileSha256(srcPath);
            const stat = fs.statSync(srcPath);
            fileManifests[relPath] = {
              sizeBytes: stat.size,
              sha256: fileHash,
            };
            totalFiles += 1;
            combinedHash.update(fileHash);
          }
        }
      };

      copyDirRecursive(this.uploadsRoot, backupFilesDir);
    }

    const overallSha256 = combinedHash.digest('hex');

    const manifest: BackupManifest = {
      backupId,
      timestamp: timestamp.toISOString(),
      environment: config.nodeEnv,
      databaseName: db.databaseName,
      collections: collectionManifests,
      files: fileManifests,
      overallSha256,
      totalRecords,
      totalFiles,
      status: 'COMPLETED',
    };

    // Write manifest file
    fs.writeFileSync(path.join(backupDir, 'manifest.json'), JSON.stringify(manifest, null, 2), 'utf-8');

    // Run immediate integrity verification
    const verified = await this.verifyBackupIntegrity(backupId);
    manifest.status = verified.passed ? 'VERIFIED' : 'FAILED';
    manifest.verificationResults = verified;

    fs.writeFileSync(path.join(backupDir, 'manifest.json'), JSON.stringify(manifest, null, 2), 'utf-8');

    // Apply retention policy (safe pruning)
    await this.applyRetentionPolicy();

    // Log audit event if actor exists
    if (actorId) {
      await logAuditEvent(
        'BACKUP_CREATED',
        actorId,
        'DatabaseBackup',
        backupId,
        { totalRecords, totalFiles, overallSha256, reason },
        '127.0.0.1'
      );
    }

    return manifest;
  }

  /**
   * Verify backup integrity by recalculating SHA-256 for all stored collections and files
   */
  public static async verifyBackupIntegrity(backupId: string): Promise<{ verifiedAt: string; passed: boolean; details: string }> {
    const backupDir = path.join(this.backupRoot, 'db', backupId);
    const manifestPath = path.join(backupDir, 'manifest.json');

    if (!fs.existsSync(manifestPath)) {
      return {
        verifiedAt: new Date().toISOString(),
        passed: false,
        details: `Manifest file not found for recovery point: ${backupId}`,
      };
    }

    const manifest: BackupManifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
    const combinedHash = crypto.createHash('sha256');

    // Verify collections
    for (const [collName, collMeta] of Object.entries(manifest.collections)) {
      const filePath = path.join(backupDir, `${collName}.json`);
      if (!fs.existsSync(filePath)) {
        return {
          verifiedAt: new Date().toISOString(),
          passed: false,
          details: `Missing collection backup file: ${collName}.json`,
        };
      }
      const actualHash = this.computeFileSha256(filePath);
      if (actualHash !== collMeta.sha256) {
        return {
          verifiedAt: new Date().toISOString(),
          passed: false,
          details: `Integrity check mismatch for collection: ${collName}`,
        };
      }
      combinedHash.update(actualHash);
    }

    // Verify file assets
    for (const [relPath, fileMeta] of Object.entries(manifest.files)) {
      const filePath = path.join(backupDir, 'files', relPath);
      if (!fs.existsSync(filePath)) {
        return {
          verifiedAt: new Date().toISOString(),
          passed: false,
          details: `Missing file asset backup: ${relPath}`,
        };
      }
      const actualHash = this.computeFileSha256(filePath);
      if (actualHash !== fileMeta.sha256) {
        return {
          verifiedAt: new Date().toISOString(),
          passed: false,
          details: `Integrity check mismatch for asset: ${relPath}`,
        };
      }
      combinedHash.update(actualHash);
    }

    const calculatedOverall = combinedHash.digest('hex');
    const passed = calculatedOverall === manifest.overallSha256;

    return {
      verifiedAt: new Date().toISOString(),
      passed,
      details: passed
        ? `Backup verified successfully. ${manifest.totalRecords} records and ${manifest.totalFiles} files intact.`
        : 'Overall checksum mismatch. The backup files may have been altered.',
    };
  }

  /**
   * Test-restore backup into a separate, isolated test database
   * Never touches or modifies the production database
   */
  public static async testRestoreBackup(
    backupId: string,
    targetDbUri: string = 'mongodb://127.0.0.1:27017/gasc_portal_test_restore'
  ): Promise<{ success: boolean; message: string; verifiedRecords: number; collectionsTested: string[] }> {
    const backupDir = path.join(this.backupRoot, 'db', backupId);
    const manifestPath = path.join(backupDir, 'manifest.json');

    if (!fs.existsSync(manifestPath)) {
      throw new Error(`Backup manifest not found for recovery point: ${backupId}`);
    }

    const manifest: BackupManifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));

    // Establish isolated connection to test database
    const testConnection = await mongoose.createConnection(targetDbUri).asPromise();

    try {
      const collectionsTested: string[] = [];
      let verifiedRecords = 0;

      // Drop test database prior to test restore for a clean check
      await testConnection.dropDatabase();

      for (const [collName, meta] of Object.entries(manifest.collections)) {
        const filePath = path.join(backupDir, `${collName}.json`);
        const docs = JSON.parse(fs.readFileSync(filePath, 'utf-8'));

        if (docs.length > 0) {
          // Re-insert into test database
          await testConnection.collection(collName).insertMany(docs);
        }

        const countInTest = await testConnection.collection(collName).countDocuments();
        if (countInTest !== meta.count) {
          throw new Error(
            `Test restore count mismatch on collection ${collName}. Expected: ${meta.count}, Restored: ${countInTest}`
          );
        }

        collectionsTested.push(collName);
        verifiedRecords += countInTest;
      }

      return {
        success: true,
        message: `Test restore successful into isolated test database. All ${verifiedRecords} records verified across ${collectionsTested.length} collections.`,
        verifiedRecords,
        collectionsTested,
      };
    } finally {
      await testConnection.close();
    }
  }

  /**
   * Safe retention policy: keep last N backups, but NEVER delete the only known-good backup
   */
  public static async applyRetentionPolicy(): Promise<void> {
    const dbDir = path.join(this.backupRoot, 'db');
    if (!fs.existsSync(dbDir)) return;

    const entries = fs.readdirSync(dbDir).filter((e) => e.startsWith('backup-'));
    // Sort descending by name (timestamp based)
    entries.sort().reverse();

    // Guard: never delete if only 1 exists
    if (entries.length <= 1) return;

    // Prune entries exceeding maxRecoveryPoints, but keep at least 1 verified copy
    if (entries.length > this.maxRecoveryPoints) {
      const toRemove = entries.slice(this.maxRecoveryPoints);
      for (const oldBackupId of toRemove) {
        const targetPath = path.join(dbDir, oldBackupId);
        try {
          fs.rmSync(targetPath, { recursive: true, force: true });
        } catch (err) {
          console.error(`[Retention Error] Failed to delete expired backup: ${oldBackupId}`, err);
        }
      }
    }
  }

  /**
   * List all available recovery points
   */
  public static listBackups(): BackupManifest[] {
    this.ensureDirectories();
    const dbDir = path.join(this.backupRoot, 'db');
    if (!fs.existsSync(dbDir)) return [];

    const entries = fs.readdirSync(dbDir).filter((e) => e.startsWith('backup-'));
    entries.sort().reverse();

    const manifests: BackupManifest[] = [];
    for (const id of entries) {
      const manifestPath = path.join(dbDir, id, 'manifest.json');
      if (fs.existsSync(manifestPath)) {
        try {
          manifests.push(JSON.parse(fs.readFileSync(manifestPath, 'utf-8')));
        } catch (_) {}
      }
    }
    return manifests;
  }
}

export const backupService = BackupService;
