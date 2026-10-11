import fs from 'fs';
import path from 'path';
import { User } from '../models/User';
import { Student } from '../models/Profiles';
import { Faculty } from '../models/Profiles';
import { AttendanceRecord, AttendanceSession } from '../models/Attendance';
import { Mark, Assessment } from '../models/Assessment';
import { BonafideRequest, StudentIDCard } from '../models/CertificatesAndCards';
import { AuditLog } from '../models/CommunicationAndAudit';
import { PRIMARY_ADMIN_IMMUTABLE_ID } from './admin-bootstrap.service';

const DEMO_STUDENT_PATTERNS = [
  /^23UCS042$/i,
  /^24UCS099$/i,
  /^23UCO015$/i,
  /^23UMA008$/i,
  /^23UEN021$/i,
  /^23UTA030$/i,
  /^DEMO/i,
  /^TEST/i,
];

const DEMO_FACULTY_PATTERNS = [
  /^FAC-CS-01$/i,
  /^FAC-CS-02$/i,
  /^FAC-MA-01$/i,
  /^FAC-EN-01$/i,
  /^FAC-TA-01$/i,
  /^FAC-CO-01$/i,
  /^DEMO/i,
  /^TEST/i,
];

export interface CleanupInventory {
  demoUsersCount: number;
  demoStudentsCount: number;
  demoFacultyCount: number;
  demoAttendanceCount: number;
  demoMarksCount: number;
  demoBonafideCount: number;
  preservedAdminCount: number;
  preservedPrimaryAdminId: string;
  demoUserIdentifiers: string[];
}

export interface CleanupResult {
  dryRun: boolean;
  inventory: CleanupInventory;
  backupPath?: string;
  deletedCounts?: {
    users: number;
    students: number;
    faculty: number;
    attendance: number;
    marks: number;
    bonafide: number;
  };
  message: string;
}

export class CleanupService {
  /**
   * Scans database to distinguish demo/seed data from legitimate college records and the Primary Admin.
   */
  static async getInventory(): Promise<CleanupInventory> {
    const allUsers = await User.find({}).lean();

    const demoUserIds: any[] = [];
    const demoIdentifiers: string[] = [];

    for (const u of allUsers) {
      // NEVER touch the primary administrator
      if (u.isPrimaryAdmin || u.adminImmutableId === PRIMARY_ADMIN_IMMUTABLE_ID) {
        continue;
      }

      // Check student identifiers
      const isDemoStudent = DEMO_STUDENT_PATTERNS.some((p) => p.test(u.identifier));
      // Check faculty identifiers
      const isDemoFaculty = DEMO_FACULTY_PATTERNS.some((p) => p.test(u.identifier));

      if (isDemoStudent || isDemoFaculty) {
        demoUserIds.push(u._id);
        demoIdentifiers.push(u.identifier);
      }
    }

    const demoStudentsCount = await Student.countDocuments({ userId: { $in: demoUserIds } });
    const demoFacultyCount = await Faculty.countDocuments({ userId: { $in: demoUserIds } });
    const demoAttendanceCount = await AttendanceRecord.countDocuments({ studentId: { $in: demoUserIds } });
    const demoMarksCount = await Mark.countDocuments({ studentId: { $in: demoUserIds } });
    const demoBonafideCount = await BonafideRequest.countDocuments({ studentId: { $in: demoUserIds } });

    const primaryAdmin = await User.findOne({ isPrimaryAdmin: true }).lean();

    return {
      demoUsersCount: demoUserIds.length,
      demoStudentsCount,
      demoFacultyCount,
      demoAttendanceCount,
      demoMarksCount,
      demoBonafideCount,
      preservedAdminCount: primaryAdmin ? 1 : 0,
      preservedPrimaryAdminId: primaryAdmin?.adminImmutableId || PRIMARY_ADMIN_IMMUTABLE_ID,
      demoUserIdentifiers: demoIdentifiers,
    };
  }

  /**
   * Executes data cleanup with dry-run support and automated pre-wipe backup.
   */
  static async performCleanup(dryRun: boolean = true, adminUserId?: string): Promise<CleanupResult> {
    const inventory = await this.getInventory();

    if (dryRun) {
      return {
        dryRun: true,
        inventory,
        message: 'DRY RUN COMPLETE: No data was modified or deleted.',
      };
    }

    // Step 1: Gather all records to be deleted for safe pre-wipe backup
    const demoUsers = await User.find({
      isPrimaryAdmin: { $ne: true },
      adminImmutableId: { $ne: PRIMARY_ADMIN_IMMUTABLE_ID },
      $or: [
        { identifier: { $in: inventory.demoUserIdentifiers } },
      ],
    }).lean();

    const demoUserIds = demoUsers.map((u) => u._id);

    const demoStudents = await Student.find({ userId: { $in: demoUserIds } }).lean();
    const demoFaculty = await Faculty.find({ userId: { $in: demoUserIds } }).lean();
    const demoAttendance = await AttendanceRecord.find({ studentId: { $in: demoUserIds } }).lean();
    const demoMarks = await Mark.find({ studentId: { $in: demoUserIds } }).lean();
    const demoBonafide = await BonafideRequest.find({ studentId: { $in: demoUserIds } }).lean();

    // Step 2: Write backup JSON file before destructive deletion
    const backupDir = path.resolve(__dirname, '../../../backups');
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }

    const backupTimestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = path.join(backupDir, `pre-cleanup-demo-backup-${backupTimestamp}.json`);

    const backupPayload = {
      createdAt: new Date().toISOString(),
      reason: 'Automated pre-cleanup backup of verified demo records',
      users: demoUsers,
      students: demoStudents,
      faculty: demoFaculty,
      attendance: demoAttendance,
      marks: demoMarks,
      bonafide: demoBonafide,
    };

    await fs.promises.writeFile(backupPath, JSON.stringify(backupPayload, null, 2), 'utf8');

    // Step 3: Delete only verified demo records, preserving real accounts and primary admin
    const delBonafide = await BonafideRequest.deleteMany({ studentId: { $in: demoUserIds } });
    const delMarks = await Mark.deleteMany({ studentId: { $in: demoUserIds } });
    const delAttendance = await AttendanceRecord.deleteMany({ studentId: { $in: demoUserIds } });
    const delStudents = await Student.deleteMany({ userId: { $in: demoUserIds } });
    const delFaculty = await Faculty.deleteMany({ userId: { $in: demoUserIds } });
    const delUsers = await User.deleteMany({ _id: { $in: demoUserIds } });

    // Step 4: Record Audit Log
    try {
      await AuditLog.create({
        action: 'DATA_CLEANUP_EXECUTED',
        performedBy: adminUserId || demoUserIds[0] || undefined,
        targetEntity: 'SYSTEM_MAINTENANCE',
        details: {
          backupFile: path.basename(backupPath),
          deletedUsers: delUsers.deletedCount,
          preservedPrimaryAdminId: PRIMARY_ADMIN_IMMUTABLE_ID,
        },
        timestamp: new Date(),
      });
    } catch {
      // Ignore if audit log collection error
    }

    return {
      dryRun: false,
      inventory,
      backupPath,
      deletedCounts: {
        users: delUsers.deletedCount,
        students: delStudents.deletedCount,
        faculty: delFaculty.deletedCount,
        attendance: delAttendance.deletedCount,
        marks: delMarks.deletedCount,
        bonafide: delBonafide.deletedCount,
      },
      message: `SUCCESS: Removed ${delUsers.deletedCount} demo accounts. Backup stored at ${path.basename(backupPath)}. Primary Administrator preserved.`,
    };
  }
}
