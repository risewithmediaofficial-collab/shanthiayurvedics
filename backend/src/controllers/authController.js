import { AuthService } from '../services/authService.js';
import { ApiResponse } from '../utils/apiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { env } from '../config/env.js';
import { User } from '../models/User.js';
import { AuditService } from '../services/auditService.js';
import { RbacService } from '../services/rbacService.js';
import { ROLES } from '../constants/roles.js';

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: env.NODE_ENV === 'production',
  sameSite: env.NODE_ENV === 'production' ? 'strict' : 'lax',
  path: '/'
};

const setAuthCookies = (res, result) => {
  const isProd = env.NODE_ENV === 'production';
  const accessMaxAge = (isProd ? 15 : 7 * 24 * 60) * 60 * 1000; // 7 days in dev, 15m in prod
  const refreshMaxAge = 7 * 24 * 60 * 60 * 1000; // 7 days

  res.cookie('accessToken', result.accessToken, {
    ...COOKIE_OPTIONS,
    maxAge: accessMaxAge
  });
  res.cookie('refreshToken', result.refreshToken, {
    ...COOKIE_OPTIONS,
    maxAge: refreshMaxAge
  });
};

export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const result = await AuthService.login({ email, password, req });

  // Set HTTP-only cookies
  setAuthCookies(res, result);

  return ApiResponse.success(
    res,
    {
      user: result.user,
      accessToken: result.accessToken,
      refreshToken: result.refreshToken
    },
    'Login successful'
  );
});

export const refresh = asyncHandler(async (req, res) => {
  const rawRefreshToken = req.cookies?.refreshToken || req.body?.refreshToken;
  const result = await AuthService.refreshSession({ rawRefreshToken, req });

  // Rotate cookies
  setAuthCookies(res, result);

  return ApiResponse.success(
    res,
    {
      user: result.user,
      accessToken: result.accessToken,
      refreshToken: result.refreshToken
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
  const getRawRefreshToken = () => {
    return req.headers['x-refresh-token'] || req.cookies?.refreshToken;
  };

  const refreshFromToken = async () => {
    const rawRefreshToken = getRawRefreshToken();
    if (!rawRefreshToken) return null;

    try {
      const result = await AuthService.refreshSession({ rawRefreshToken, req });
      setAuthCookies(res, result);
      return result;
    } catch {
      return null;
    }
  };

  let token = null;
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.split(' ')[1];
  } else if (req.cookies?.accessToken) {
    token = req.cookies.accessToken;
  }

  if (!token) {
    const refreshed = await refreshFromToken();
    if (refreshed) {
      return ApiResponse.success(res, {
        user: refreshed.user,
        accessToken: refreshed.accessToken,
        refreshToken: refreshed.refreshToken,
        isAuthenticated: true
      }, 'Session refreshed');
    }
    return ApiResponse.success(res, { user: null, isAuthenticated: false }, 'No active session');
  }

  try {
    const decoded = AuthService.verifyAccessToken(token);
    const user = await User.findById(decoded.userId || decoded.id)
      .populate('branchId', 'name code')
      .populate('branches', 'name code')
      .lean();

    if (!user || !user.isActive || (user.lockUntil && new Date(user.lockUntil) > new Date()) ||
        (user.passwordChangedAt && decoded.iat < Math.floor(new Date(user.passwordChangedAt).getTime() / 1000))) {
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
          permissions: await RbacService.getPermissionsForRole(user.role),
          username: user.username,
          brand: user.brand,
          assignedBrands: user.assignedBrands || [],
          branchId: user.branchId?._id || user.branchId,
          branchName: user.branchId?.name,
          branchCode: user.branchId?.code,
          branches: user.branches || [],
          isActive: user.isActive
        },
        accessToken: token,
        isAuthenticated: true
      },
      'Active session retrieved'
    );
  } catch {
    const refreshed = await refreshFromToken();
    if (refreshed) {
      return ApiResponse.success(res, {
        user: refreshed.user,
        accessToken: refreshed.accessToken,
        refreshToken: refreshed.refreshToken,
        isAuthenticated: true
      }, 'Session refreshed');
    }
    return ApiResponse.success(res, { user: null, isAuthenticated: false }, 'Session expired or invalid');
  }
});

export const switchAccount = asyncHandler(async (req, res) => {
  const { role, email } = req.body;
  const currentUserRole = req.user?.role;
  const isSwitched = Boolean(req.headers['x-switched-from'] || req.cookies?.switchedFromOwner);

  if (currentUserRole !== ROLES.OWNER && !isSwitched) {
    if (role !== ROLES.OWNER && email !== 'owner@shanthiayurvedas.com') {
      return ApiResponse.error(res, 'Only an Owner can switch accounts', 403);
    }
  }

  const targetUser = await AuthService.ensureQuickAccount({ role, email });
  if (!targetUser) {
    return ApiResponse.error(res, 'Target account not found', 404);
  }

  const result = await AuthService.createSessionForUser(targetUser, req, 'AUTH_SWITCH');
  setAuthCookies(res, result);

  return ApiResponse.success(
    res,
    {
      user: result.user,
      accessToken: result.accessToken,
      refreshToken: result.refreshToken
    },
    `Switched to ${result.user.name}`
  );
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
