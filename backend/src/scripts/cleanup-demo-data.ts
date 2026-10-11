import { connectDatabase, disconnectDatabase } from '../config/database';
import { CleanupService } from '../services/cleanup.service';
import { bootstrapPrimaryAdmin } from '../services/admin-bootstrap.service';

async function runCleanupCli() {
  const isExecute = process.argv.includes('--execute');
  const dryRun = !isExecute;

  console.log(`====================================================`);
  console.log(`  GASC Connect — Demo Data Cleanup Utility          `);
  console.log(`  Mode: ${dryRun ? 'DRY-RUN (Safe, no changes)' : 'EXECUTE (Backup & Deletion)'} `);
  console.log(`====================================================`);

  await connectDatabase();

  // Ensure Primary Administrator is intact
  await bootstrapPrimaryAdmin();

  const result = await CleanupService.performCleanup(dryRun);

  console.log('\n--- Cleanup Summary ---');
  console.log(`Mode:                      ${result.dryRun ? 'DRY RUN' : 'EXECUTED'}`);
  console.log(`Demo Users Found:          ${result.inventory.demoUsersCount}`);
  console.log(`Demo Students:             ${result.inventory.demoStudentsCount}`);
  console.log(`Demo Faculty:              ${result.inventory.demoFacultyCount}`);
  console.log(`Demo Attendance Records:   ${result.inventory.demoAttendanceCount}`);
  console.log(`Demo Marks Records:        ${result.inventory.demoMarksCount}`);
  console.log(`Preserved Primary Admin:   [${result.inventory.preservedPrimaryAdminId}] (Count: ${result.inventory.preservedAdminCount})`);
  console.log(`Demo User Identifiers:     ${result.inventory.demoUserIdentifiers.join(', ')}`);

  if (!dryRun) {
    console.log(`\nBackup Saved to:           ${result.backupPath}`);
    console.log(`Deleted Users:             ${result.deletedCounts?.users}`);
    console.log(`Deleted Students:          ${result.deletedCounts?.students}`);
    console.log(`Deleted Faculty:           ${result.deletedCounts?.faculty}`);
  }

  console.log(`\nResult: ${result.message}`);
  console.log(`====================================================\n`);

  await disconnectDatabase();
}

runCleanupCli().catch((err) => {
  console.error('[Cleanup Error]:', err);
  process.exit(1);
});
