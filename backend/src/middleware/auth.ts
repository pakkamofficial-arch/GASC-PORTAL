import { Response, NextFunction } from 'express';
import { AuthenticatedRequest, UserRole } from '../types';
import { verifyAccessToken } from '../utils/jwt';
import { User, Faculty, Student } from '../models';
import { sendError } from '../utils/response';

export const authenticate = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      sendError(res, 'Authentication token required', 401);
      return;
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
      sendError(res, 'Invalid authorization header format', 401);
      return;
    }

    const decoded = verifyAccessToken(token);

    // Verify user in database and check active status
    const user = await User.findById(decoded.userId).lean();
    if (!user) {
      sendError(res, 'User account no longer exists', 401);
      return;
    }

    if (user.status !== 'ACTIVE') {
      sendError(res, `Account is currently ${user.status.toLowerCase()}. Contact administration.`, 403);
      return;
    }

    if (
      user.mustChangePassword &&
      !req.originalUrl.includes('/auth/change-password') &&
      !req.originalUrl.includes('/auth/logout') &&
      !req.originalUrl.includes('/auth/me')
    ) {
      sendError(res, 'Temporary password change required before accessing collegiate portal.', 403, {
        mustChangePassword: true,
      });
      return;
    }

    let departmentId: string | undefined;
    let isHod = false;

    if (user.role === 'FACULTY' || user.role === 'STAFF') {
      const fac = await Faculty.findOne({ userId: user._id }).select('departmentId isHod').lean();
      if (fac) {
        departmentId = fac.departmentId?.toString();
        if (fac.isHod) isHod = true;
      }
    } else if (user.role === 'STUDENT') {
      const stu = await Student.findOne({ userId: user._id }).select('departmentId').lean();
      if (stu) {
        departmentId = stu.departmentId?.toString();
      }
    }

    // Attach verified user payload
    req.user = {
      userId: user._id.toString(),
      role: user.role,
      identifier: user.identifier,
      departmentId,
    };
    (req.user as any).isHod = isHod;
    (req.user as any).mustChangePassword = Boolean(user.mustChangePassword);

    next();
  } catch (error: any) {
    if (error.name === 'TokenExpiredError') {
      sendError(res, 'Access token has expired. Please refresh your session.', 401);
      return;
    }
    sendError(res, 'Invalid or corrupted access token', 401);
  }
};

export const authorize = (...allowedRoles: UserRole[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      sendError(res, 'Unauthorized access', 401);
      return;
    }

    const userRole = req.user.role;
    const isHod = (req.user as any).isHod || (userRole as any) === 'HOD';

    let isAuthorized = allowedRoles.includes(userRole);

    // Treat STAFF and FACULTY as interchangeable staff roles
    if (!isAuthorized) {
      if ((allowedRoles.includes('FACULTY') || allowedRoles.includes('STAFF')) && (userRole === 'FACULTY' || userRole === 'STAFF' || (userRole as any) === 'HOD')) {
        isAuthorized = true;
      }
    }

    // If allowedRoles contains HOD (legacy), verify staff or ADMIN
    if (!isAuthorized && (allowedRoles as any).includes('HOD') && (userRole === 'ADMIN' || userRole === 'FACULTY' || userRole === 'STAFF' || isHod)) {
      isAuthorized = true;
    }

    if (!isAuthorized) {
      sendError(
        res,
        `Forbidden: Role '${userRole}' is not authorized to access this resource`,
        403
      );
      return;
    }

    next();
  };
};
