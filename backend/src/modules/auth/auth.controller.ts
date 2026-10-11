import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { User, Student, Faculty } from '../../models';
import { generateAccessToken, generateRefreshToken, verifyRefreshToken } from '../../utils/jwt';
import { sendError, sendSuccess } from '../../utils/response';
import { AuthenticatedRequest } from '../../types';
import { logAuditEvent } from '../../middleware/audit';

const LoginSchema = z.object({
  identifier: z.string().min(3, 'College ID or register number is required'),
  password: z.string().min(4, 'Password must be at least 4 characters'),
});

const ChangePasswordSchema = z.object({
  currentPassword: z.string().min(4),
  newPassword: z.string().min(6, 'New password must be at least 6 characters'),
});

export const login = async (req: Request, res: Response): Promise<void> => {
  const parsed = LoginSchema.safeParse(req.body);
  if (!parsed.success) {
    sendError(res, parsed.error.errors[0].message, 422);
    return;
  }

  const { identifier, password } = parsed.data;
  const normalizedId = identifier.trim().toUpperCase();

  // Find user by identifier
  const user = await User.findOne({ identifier: normalizedId });
  if (!user) {
    sendError(res, 'Invalid College ID/Register Number or Password', 401);
    return;
  }

  if (user.status !== 'ACTIVE') {
    sendError(res, `Account is ${user.status.toLowerCase()}. Please contact administration.`, 403);
    return;
  }

  const isMatch = await user.comparePassword(password);
  if (!isMatch) {
    sendError(res, 'Invalid College ID/Register Number or Password', 401);
    return;
  }

  // Generate tokens
  const payload = {
    userId: user._id.toString(),
    role: user.role,
    identifier: user.identifier,
  };

  const accessToken = generateAccessToken(payload);
  const refreshToken = generateRefreshToken(payload);

  // Rotate tokens: store refresh token in user document
  user.refreshTokens.push(refreshToken);
  if (user.refreshTokens.length > 5) {
    user.refreshTokens.shift(); // keep max 5 active refresh tokens
  }
  user.lastLogin = new Date();
  await user.save();

  // Fetch role-specific profile details
  let profileData: any = null;
  if (user.role === 'STUDENT') {
    profileData = await Student.findOne({ userId: user._id })
      .populate('departmentId', 'name code')
      .populate('courseId', 'name code')
      .lean();
  } else if (user.role === 'FACULTY') {
    profileData = await Faculty.findOne({ userId: user._id })
      .populate('departmentId', 'name code')
      .populate('assignedClasses.subjectId', 'name code')
      .populate('assignedClasses.departmentId', 'name code')
      .lean();
  }

  await logAuditEvent('USER_LOGIN', user._id, 'User', user._id.toString(), { role: user.role }, req.ip);

  sendSuccess(
    res,
    {
      tokens: {
        accessToken,
        refreshToken,
      },
      user: {
        id: user._id,
        identifier: user.identifier,
        role: user.role,
        email: user.email,
        phone: user.phone,
        status: user.status,
        mustChangePassword: Boolean(user.mustChangePassword),
      },
      mustChangePassword: Boolean(user.mustChangePassword),
      profile: profileData,
    },
    user.mustChangePassword
      ? 'Login successful. Temporary password change is required to proceed.'
      : 'Login successful'
  );
};

export const refreshToken = async (req: Request, res: Response): Promise<void> => {
  const { refreshToken: token } = req.body;
  if (!token) {
    sendError(res, 'Refresh token is required', 400);
    return;
  }

  try {
    const decoded = verifyRefreshToken(token);
    const user = await User.findById(decoded.userId);

    if (!user || !user.refreshTokens.includes(token)) {
      sendError(res, 'Invalid or revoked refresh token', 401);
      return;
    }

    if (user.status !== 'ACTIVE') {
      sendError(res, 'Account is not active', 403);
      return;
    }

    // Token rotation: remove old refresh token, generate new pair
    user.refreshTokens = user.refreshTokens.filter((t) => t !== token);

    const payload = {
      userId: user._id.toString(),
      role: user.role,
      identifier: user.identifier,
    };

    const newAccessToken = generateAccessToken(payload);
    const newRefreshToken = generateRefreshToken(payload);

    user.refreshTokens.push(newRefreshToken);
    await user.save();

    sendSuccess(
      res,
      {
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
      },
      'Tokens refreshed successfully'
    );
  } catch (err) {
    sendError(res, 'Expired or invalid refresh token', 401);
  }
};

export const logout = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { refreshToken: token } = req.body;
  if (req.user && token) {
    await User.findByIdAndUpdate(req.user.userId, {
      $pull: { refreshTokens: token },
    });
  }
  sendSuccess(res, null, 'Logged out successfully');
};

export const getMe = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  if (!req.user) {
    sendError(res, 'Not authenticated', 401);
    return;
  }

  const user = await User.findById(req.user.userId).select('-passwordHash -refreshTokens').lean();
  if (!user) {
    sendError(res, 'User not found', 404);
    return;
  }

  let profile: any = null;
  if (user.role === 'STUDENT') {
    profile = await Student.findOne({ userId: user._id })
      .populate('departmentId', 'name code')
      .populate('courseId', 'name code')
      .lean();
  } else if (user.role === 'FACULTY') {
    profile = await Faculty.findOne({ userId: user._id })
      .populate('departmentId', 'name code')
      .populate('assignedClasses.subjectId', 'name code')
      .populate('assignedClasses.departmentId', 'name code')
      .lean();
  }

  sendSuccess(res, { user, profile }, 'Profile fetched successfully');
};

export const changePassword = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const parsed = ChangePasswordSchema.safeParse(req.body);
  if (!parsed.success) {
    sendError(res, parsed.error.errors[0].message, 422);
    return;
  }

  const { currentPassword, newPassword } = parsed.data;

  if (newPassword === currentPassword) {
    sendError(res, 'New password must be different from your current or temporary password.', 400);
    return;
  }

  // Password strength validation
  if (newPassword.length < 8) {
    sendError(res, 'New password must be at least 8 characters long.', 422);
    return;
  }
  const commonWeak = ['12345678', 'password', 'password123', 'admin123', 'qwerty1234'];
  if (commonWeak.includes(newPassword.toLowerCase())) {
    sendError(res, 'Password is too common and weak. Please choose a stronger password.', 422);
    return;
  }
  const hasUpper = /[A-Z]/.test(newPassword);
  const hasLower = /[a-z]/.test(newPassword);
  const hasDigitOrSpecial = /[\d!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(newPassword);
  if (!hasUpper || !hasLower || !hasDigitOrSpecial) {
    sendError(
      res,
      'Password must contain at least one uppercase letter, one lowercase letter, and one number or special symbol.',
      422
    );
    return;
  }

  const user = await User.findById(req.user!.userId);
  if (!user) {
    sendError(res, 'User not found', 404);
    return;
  }

  const isMatch = await user.comparePassword(currentPassword);
  if (!isMatch) {
    sendError(res, 'Current password does not match', 400);
    return;
  }

  user.passwordHash = await bcrypt.hash(newPassword, 12);
  user.mustChangePassword = false;
  user.isActivated = true;

  // Renew tokens with active status
  const payload = {
    userId: user._id.toString(),
    role: user.role,
    identifier: user.identifier,
  };
  const accessToken = generateAccessToken(payload);
  const refreshToken = generateRefreshToken(payload);
  user.refreshTokens = [refreshToken];
  await user.save();

  await logAuditEvent('PASSWORD_CHANGED', user._id, 'User', user._id.toString(), {}, req.ip);
  sendSuccess(
    res,
    {
      tokens: { accessToken, refreshToken },
      user: {
        id: user._id,
        identifier: user.identifier,
        role: user.role,
        status: user.status,
        mustChangePassword: false,
      },
    },
    'Password updated successfully. Account is now fully secured.'
  );
};

export const forgotPassword = async (req: Request, res: Response): Promise<void> => {
  const { identifier } = req.body;
  if (!identifier) {
    sendError(res, 'Identifier is required', 400);
    return;
  }

  sendSuccess(
    res,
    {
      instructions:
        'For security, password recovery requires verification. An OTP has been sent to your registered college phone/email, or visit the GASC Administration office with your original ID card.',
    },
    'Password recovery request initiated'
  );
};

const ActivateStudentSchema = z.object({
  registerNo: z.string().min(3, 'Register number is required'),
  dob: z.string().min(8, 'Date of birth is required (YYYY-MM-DD)'),
  newPassword: z.string().min(6, 'Password must be at least 6 characters'),
});

export const activateStudent = async (req: Request, res: Response): Promise<void> => {
  const parsed = ActivateStudentSchema.safeParse(req.body);
  if (!parsed.success) {
    sendError(res, parsed.error.errors[0].message, 422);
    return;
  }

  const { registerNo, dob, newPassword } = parsed.data;
  const normalizedReg = registerNo.trim().toUpperCase();

  // Find official student record
  const student = await Student.findOne({ registerNo: normalizedReg });
  if (!student) {
    sendError(res, 'Official student record not found. Please check register number.', 404);
    return;
  }

  // Normalize DOB strings for safe verification (YYYY-MM-DD)
  const officialDobStr = new Date(student.dob).toISOString().split('T')[0];
  const inputDobStr = new Date(dob).toISOString().split('T')[0];

  if (officialDobStr !== inputDobStr) {
    // Audit failed verification attempt without logging DOB value
    sendError(res, 'Date of birth does not match official admission record.', 401);
    return;
  }

  // Find user account
  const user = await User.findById(student.userId);
  if (!user) {
    sendError(res, 'User credentials record missing. Contact administration.', 404);
    return;
  }

  if (user.isActivated) {
    sendError(res, 'Student account has already been activated. Please proceed to login.', 400);
    return;
  }

  // Update password and activate account
  user.passwordHash = await bcrypt.hash(newPassword, 12);
  user.isActivated = true;
  user.status = 'ACTIVE';
  user.activatedAt = new Date();

  // Generate tokens
  const payload = {
    userId: user._id.toString(),
    role: user.role,
    identifier: user.identifier,
  };
  const accessToken = generateAccessToken(payload);
  const refreshToken = generateRefreshToken(payload);

  user.refreshTokens = [refreshToken];
  user.lastLogin = new Date();
  await user.save();

  await logAuditEvent(
    'ACCOUNT_ACTIVATED',
    user._id,
    'Student',
    student._id.toString(),
    { registerNo: normalizedReg },
    req.ip
  );

  const populatedStudent = await Student.findById(student._id)
    .populate('departmentId', 'name code')
    .populate('courseId', 'name code')
    .lean();

  sendSuccess(
    res,
    {
      user: {
        id: user._id,
        identifier: user.identifier,
        role: user.role,
        status: user.status,
        isActivated: true,
      },
      profile: populatedStudent,
      tokens: { accessToken, refreshToken },
    },
    'Account activated successfully. Welcome to Government College Connect!'
  );
};

const ActivateStaffSchema = z.object({
  employeeId: z.string().min(3, 'Employee ID is required'),
  dob: z.string().optional(),
  activationCode: z.string().optional(),
  newPassword: z.string().min(6, 'Password must be at least 6 characters'),
});

export const activateStaff = async (req: Request, res: Response): Promise<void> => {
  const parsed = ActivateStaffSchema.safeParse(req.body);
  if (!parsed.success) {
    sendError(res, parsed.error.errors[0].message, 422);
    return;
  }

  const { employeeId, dob, activationCode, newPassword } = parsed.data;
  const normalizedEmpId = employeeId.trim().toUpperCase();

  const faculty = await Faculty.findOne({ employeeId: normalizedEmpId });
  if (!faculty) {
    sendError(res, 'Faculty / staff record not found. Please contact Principal office.', 404);
    return;
  }

  const user = await User.findById(faculty.userId);
  if (!user) {
    sendError(res, 'User record not found.', 404);
    return;
  }

  if (user.isActivated) {
    sendError(res, 'Staff account has already been activated. Please proceed to login.', 400);
    return;
  }

  // Verification via DOB (primary) or activationCode (alternative)
  let isVerified = false;
  if (dob && faculty.dob) {
    const officialDobStr = new Date(faculty.dob).toISOString().split('T')[0];
    const inputDobStr = new Date(dob).toISOString().split('T')[0];
    if (officialDobStr === inputDobStr) {
      isVerified = true;
    }
  }
  if (!isVerified && activationCode && user.activationCode) {
    if (user.activationCode === activationCode.trim()) {
      isVerified = true;
    }
  }

  if (!isVerified) {
    if (activationCode && !dob) {
      sendError(res, 'Invalid staff activation code. Please check your activation letter or contact Principal office.', 401);
      return;
    }
    sendError(res, 'Verification failed. Date of birth or activation code does not match official record.', 401);
    return;
  }

  user.passwordHash = await bcrypt.hash(newPassword, 12);
  user.isActivated = true;
  user.status = 'ACTIVE';
  user.activatedAt = new Date();
  user.activationCode = undefined;

  const payload = {
    userId: user._id.toString(),
    role: user.role,
    identifier: user.identifier,
  };
  const accessToken = generateAccessToken(payload);
  const refreshToken = generateRefreshToken(payload);

  user.refreshTokens = [refreshToken];
  user.lastLogin = new Date();
  await user.save();

  await logAuditEvent(
    'STAFF_ACCOUNT_ACTIVATED',
    user._id,
    'Faculty',
    faculty._id.toString(),
    { employeeId: normalizedEmpId },
    req.ip
  );

  const populatedFaculty = await Faculty.findById(faculty._id)
    .populate('departmentId', 'name code')
    .lean();

  sendSuccess(
    res,
    {
      user: {
        id: user._id,
        identifier: user.identifier,
        role: user.role,
        status: user.status,
        isActivated: true,
      },
      profile: populatedFaculty,
      tokens: { accessToken, refreshToken },
    },
    'Staff account activated successfully.'
  );
};

