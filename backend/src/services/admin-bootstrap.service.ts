import bcrypt from 'bcryptjs';
import { User, IUser } from '../models/User';
import { AuditLog } from '../models/CommunicationAndAudit';
import { config } from '../config';

export const PRIMARY_ADMIN_IMMUTABLE_ID = 'GASC-ROOT-ADM-001';

export interface AdminBootstrapResult {
  initialized: boolean;
  adminIdentifier: string;
  adminImmutableId: string;
  message: string;
}

/**
 * Ensures exactly one authoritative Primary Administrator exists in the system.
 * Enforced via MongoDB partial unique index on `isPrimaryAdmin: true` and `adminImmutableId`.
 * Concurrency-safe: handles simultaneous bootstrap attempts gracefully.
 */
export async function bootstrapPrimaryAdmin(): Promise<AdminBootstrapResult> {
  // Check if primary admin already exists
  const existingPrimary = await User.findOne({ isPrimaryAdmin: true });
  if (existingPrimary) {
    // Ensure adminImmutableId is populated
    if (!existingPrimary.adminImmutableId) {
      existingPrimary.adminImmutableId = PRIMARY_ADMIN_IMMUTABLE_ID;
      await existingPrimary.save();
    }
    return {
      initialized: false,
      adminIdentifier: existingPrimary.identifier,
      adminImmutableId: existingPrimary.adminImmutableId || PRIMARY_ADMIN_IMMUTABLE_ID,
      message: 'Primary Administrator already initialized and verified.',
    };
  }

  // Check if an existing admin account with the identifier exists to upgrade it
  const initialIdentifier = (process.env.INITIAL_ADMIN_IDENTIFIER || 'ADMIN001').toUpperCase().trim();
  const initialPassword = process.env.INITIAL_ADMIN_PASSWORD || 'Admin@Gasc2026!';

  const existingByIdentifier = await User.findOne({ identifier: initialIdentifier });
  if (existingByIdentifier) {
    existingByIdentifier.isPrimaryAdmin = true;
    existingByIdentifier.adminImmutableId = PRIMARY_ADMIN_IMMUTABLE_ID;
    existingByIdentifier.role = 'ADMIN';
    existingByIdentifier.status = 'ACTIVE';
    existingByIdentifier.isActivated = true;
    await existingByIdentifier.save();

    await recordAdminAudit(
      existingByIdentifier._id,
      'ADMIN_DESIGNATED_PRIMARY',
      'Designated existing administrator account as authoritative Primary Admin'
    );

    return {
      initialized: true,
      adminIdentifier: existingByIdentifier.identifier,
      adminImmutableId: PRIMARY_ADMIN_IMMUTABLE_ID,
      message: 'Designated authoritative Primary Administrator successfully.',
    };
  }

  // Otherwise, create new authoritative Primary Admin
  const salt = await bcrypt.genSalt(12);
  const passwordHash = await bcrypt.hash(initialPassword, salt);

  try {
    const primaryAdmin = await User.create({
      identifier: initialIdentifier,
      passwordHash,
      role: 'ADMIN',
      status: 'ACTIVE',
      isActivated: true,
      isPrimaryAdmin: true,
      adminImmutableId: PRIMARY_ADMIN_IMMUTABLE_ID,
      email: process.env.INITIAL_ADMIN_EMAIL || 'admin@gasc-kuthalam.edu.in',
    });

    await recordAdminAudit(
      primaryAdmin._id,
      'ADMIN_BOOTSTRAP_INITIALIZED',
      'Initial authoritative Primary Administrator provisioned securely.'
    );

    return {
      initialized: true,
      adminIdentifier: primaryAdmin.identifier,
      adminImmutableId: PRIMARY_ADMIN_IMMUTABLE_ID,
      message: 'Authoritative Primary Administrator created successfully.',
    };
  } catch (err: any) {
    // If a concurrent thread created the admin, fetch and return it
    if (err.code === 11000) {
      const concurrentAdmin = await User.findOne({ isPrimaryAdmin: true });
      if (concurrentAdmin) {
        return {
          initialized: false,
          adminIdentifier: concurrentAdmin.identifier,
          adminImmutableId: concurrentAdmin.adminImmutableId || PRIMARY_ADMIN_IMMUTABLE_ID,
          message: 'Primary Administrator was initialized concurrently by another process.',
        };
      }
    }
    throw err;
  }
}

/**
 * Rotates credentials for the primary administrator without changing immutable ID.
 */
export async function rotatePrimaryAdminCredentials(
  adminUserId: string,
  newPassword?: string,
  newEmail?: string
): Promise<{ success: boolean; message: string }> {
  const admin = await User.findById(adminUserId);
  if (!admin || !admin.isPrimaryAdmin) {
    throw new Error('Unauthorized: Target account is not the primary administrator.');
  }

  if (newPassword) {
    const salt = await bcrypt.genSalt(12);
    admin.passwordHash = await bcrypt.hash(newPassword, salt);
    // Invalidate existing sessions
    admin.refreshTokens = [];
  }

  if (newEmail) {
    admin.email = newEmail.toLowerCase().trim();
  }

  await admin.save();

  await recordAdminAudit(
    admin._id,
    'ADMIN_CREDENTIALS_ROTATED',
    'Primary Administrator credentials updated and prior refresh tokens revoked.'
  );

  return {
    success: true,
    message: 'Primary Administrator credentials safely updated.',
  };
}

async function recordAdminAudit(adminId: any, action: string, details: string) {
  try {
    await AuditLog.create({
      action,
      performedBy: adminId,
      targetEntity: 'ADMIN_SECURITY',
      entityId: PRIMARY_ADMIN_IMMUTABLE_ID,
      details: { summary: details },
      timestamp: new Date(),
    });
  } catch {
    // Ignore audit log error if database is in transient state
  }
}
