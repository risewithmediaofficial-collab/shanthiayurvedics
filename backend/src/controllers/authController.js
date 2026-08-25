import { AuthService } from '../services/authService.js';
import { ApiResponse } from '../utils/apiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { env } from '../config/env.js';
import { User } from '../models/User.js';
import { AuditService } from '../services/auditService.js';

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: env.NODE_ENV === 'production',
  sameSite: env.NODE_ENV === 'production' ? 'strict' : 'lax',
  path: '/'
};

export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const result = await AuthService.login({ email, password, req });

  // Set HTTP-only cookies
  res.cookie('accessToken', result.accessToken, {
    ...COOKIE_OPTIONS,
    maxAge: 15 * 60 * 1000 // 15 minutes
  });

  res.cookie('refreshToken', result.refreshToken, {
    ...COOKIE_OPTIONS,
    maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
  });

  return ApiResponse.success(
    res,
    {
      user: result.user,
      accessToken: result.accessToken
    },
    'Login successful'
  );
});

export const refresh = asyncHandler(async (req, res) => {
  const rawRefreshToken = req.cookies?.refreshToken || req.body?.refreshToken;
  const result = await AuthService.refreshSession({ rawRefreshToken, req });

  // Rotate cookies
  res.cookie('accessToken', result.accessToken, {
    ...COOKIE_OPTIONS,
    maxAge: 15 * 60 * 1000
  });

  res.cookie('refreshToken', result.refreshToken, {
    ...COOKIE_OPTIONS,
    maxAge: 7 * 24 * 60 * 60 * 1000
  });

  return ApiResponse.success(
    res,
    {
      user: result.user,
      accessToken: result.accessToken
    },
    'Token refreshed successfully'
  );
});

export const logout = asyncHandler(async (req, res) => {
  const rawRefreshToken = req.cookies?.refreshToken || req.body?.refreshToken;
  const userId = req.user?.id;

  await AuthService.logout({ rawRefreshToken, userId, req });

  res.clearCookie('accessToken', COOKIE_OPTIONS);
  res.clearCookie('refreshToken', COOKIE_OPTIONS);

  return ApiResponse.success(res, null, 'Logged out successfully');
});

export const getSession = asyncHandler(async (req, res) => {
  let token = null;
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.split(' ')[1];
  } else if (req.cookies?.accessToken) {
    token = req.cookies.accessToken;
  }

  if (!token) {
    return ApiResponse.success(res, { user: null, isAuthenticated: false }, 'No active session');
  }

  try {
    const decoded = AuthService.verifyAccessToken(token);
    const user = await User.findById(decoded.userId || decoded.id)
      .populate('branchId', 'name code')
      .populate('branches', 'name code')
      .lean();

    if (!user || !user.isActive) {
      return ApiResponse.success(res, { user: null, isAuthenticated: false }, 'Session inactive');
    }

    return ApiResponse.success(
      res,
      {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          branchId: user.branchId?._id || user.branchId,
          branchName: user.branchId?.name,
          branchCode: user.branchId?.code,
          branches: user.branches || [],
          isActive: user.isActive
        },
        isAuthenticated: true
      },
      'Active session retrieved'
    );
  } catch {
    return ApiResponse.success(res, { user: null, isAuthenticated: false }, 'Session expired or invalid');
  }
});

export const getMe = asyncHandler(async (req, res) => {
  return ApiResponse.success(
    res,
    {
      user: req.user
    },
    'Current user profile fetched'
  );
});

export const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const user = await User.findById(req.user.id).select('+passwordHash');

  const isMatch = await user.verifyPassword(currentPassword);
  if (!isMatch) {
    return ApiResponse.error(res, 'Current password is incorrect', 400);
  }

  user.passwordHash = await User.hashPassword(newPassword);
  user.passwordChangedAt = new Date();
  await user.save();

  // Invalidate all existing sessions on password change
  await AuthService.logoutAllDevices(user._id);

  await AuditService.log({
    userId: user._id,
    branchId: user.branchId,
    action: 'USER_PASSWORD_CHANGE',
    module: 'auth',
    resourceType: 'User',
    resourceId: user._id,
    req
  });

  res.clearCookie('accessToken', COOKIE_OPTIONS);
  res.clearCookie('refreshToken', COOKIE_OPTIONS);

  return ApiResponse.success(res, null, 'Password changed successfully. Please sign in again.');
});
