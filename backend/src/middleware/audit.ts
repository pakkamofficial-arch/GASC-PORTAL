import mongoose from 'mongoose';
import { AuditLog } from '../models';

export const logAuditEvent = async (
  action: string,
  performedBy: string | mongoose.Types.ObjectId,
  targetEntity: string,
  entityId?: string,
  details?: any,
  ipAddress?: string
): Promise<void> => {
  try {
    await AuditLog.create({
      action,
      performedBy,
      targetEntity,
      entityId,
      details,
      ipAddress,
      timestamp: new Date(),
    });
  } catch (error) {
    console.error('[AuditLog] Failed to record audit entry:', error);
  }
};
