import { Response } from 'express';
import { z } from 'zod';
import { Announcement } from '../../models';
import { AuthenticatedRequest } from '../../types';
import { sendError, sendSuccess } from '../../utils/response';
import { logAuditEvent } from '../../middleware/audit';

const CreateNoticeSchema = z.object({
  title: z.string().min(3),
  content: z.string().min(5),
  targetRole: z.enum(['ALL', 'STUDENT', 'FACULTY']).default('ALL'),
  priority: z.enum(['LOW', 'NORMAL', 'HIGH', 'URGENT']).default('NORMAL'),
  departmentId: z.string().optional(),
});

export const getNotices = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const role = req.user?.role || 'ALL';
    const filter: any = {
      targetRole: { $in: ['ALL', role] },
    };

    const notices = await Announcement.find(filter)
      .populate('departmentId', 'name code')
      .populate('publishedBy', 'identifier role')
      .sort({ publishedAt: -1 })
      .limit(30)
      .lean();

    sendSuccess(res, { notices }, 'Announcements retrieved');
  } catch (err: any) {
    sendError(res, err.message, 500);
  }
};

export const createNotice = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  const parsed = CreateNoticeSchema.safeParse(req.body);
  if (!parsed.success) {
    sendError(res, parsed.error.errors[0].message, 422);
    return;
  }

  const notice = await Announcement.create({
    ...parsed.data,
    publishedBy: req.user!.userId,
    publishedAt: new Date(),
  });

  await logAuditEvent('NOTICE_PUBLISHED', req.user!.userId, 'Announcement', notice._id.toString(), { title: notice.title }, req.ip);

  sendSuccess(res, notice, 'Notice published successfully', 201);
};
