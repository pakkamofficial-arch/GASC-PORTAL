import mongoose from 'mongoose';
import { connectDatabase, disconnectDatabase } from '../config/database';
import { BackupService } from '../services/backup.service';

const run = async () => {
  const args = process.argv.slice(2);
  const action = args[0] || 'create';

  console.log(`====================================================`);
  console.log(`  GASC Kuthalam — Institutional Backup Utility CLI  `);
  console.log(`  Action: ${action.toUpperCase()}                   `);
  console.log(`====================================================`);

  await connectDatabase();

  try {
    if (action === 'create') {
      console.log('[Backup] Initiating full snapshot of MongoDB and uploaded files...');
      const manifest = await BackupService.createBackup(undefined, 'Manual CLI backup execution');
      console.log(`[Backup Success] Recovery Point ID: ${manifest.backupId}`);
      console.log(`[Backup Info] Total Records: ${manifest.totalRecords} across ${Object.keys(manifest.collections).length} collections`);
      console.log(`[Backup Info] Total Files: ${manifest.totalFiles}`);
      console.log(`[Backup Info] SHA-256 Checksum: ${manifest.overallSha256}`);
      console.log(`[Backup Info] Verification: ${manifest.verificationResults?.passed ? 'PASSED (100% Intact)' : 'FAILED'}`);
    } else if (action === 'list') {
      const backups = BackupService.listBackups();
      console.log(`Found ${backups.length} recovery points:`);
      for (const b of backups) {
        console.log(` - ${b.backupId} | ${b.timestamp} | ${b.totalRecords} records | Status: ${b.status}`);
      }
    } else if (action === 'verify') {
      const backupId = args[1];
      if (!backupId) throw new Error('Specify backupId to verify (e.g. tsx src/scripts/backup-cli.ts verify backup-...)');
      const res = await BackupService.verifyBackupIntegrity(backupId);
      console.log(`[Verify Result] ${res.details}`);
    } else if (action === 'test-restore') {
      const backupId = args[1];
      if (!backupId) throw new Error('Specify backupId to test-restore (e.g. tsx src/scripts/backup-cli.ts test-restore backup-...)');
      console.log(`[Test-Restore] Restoring ${backupId} into isolated non-production database...`);
      const res = await BackupService.testRestoreBackup(backupId);
      console.log(`[Test-Restore Success]: ${res.message}`);
    } else {
      console.log('Available commands: create, list, verify <backupId>, test-restore <backupId>');
    }
  } catch (error) {
    console.error('[Backup CLI Error]:', error);
    process.exit(1);
  } finally {
    await disconnectDatabase();
  }
};

run();
