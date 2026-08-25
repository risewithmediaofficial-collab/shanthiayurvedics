import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { User } from '../models/User.js';
import { UnauthorizedError, ForbiddenError } from '../utils/errors.js';
import { RbacService } from '../services/rbacService.js';

export const authenticate = async (req, res, next) => {
  try {
    let token = null;

    // 1. Check Authorization header (Bearer token)
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
    }
    // 2. Check HTTP-only cookie
    else if (req.cookies?.accessToken) {
      token = req.cookies.accessToken;
    }

    if (!token) {
      return next(new UnauthorizedError('Authentication token required'));
    }

    // Verify JWT
    let decoded;
    try {
      decoded = jwt.verify(token, env.JWT_ACCESS_SECRET);
    } catch (err) {
      if (err.name === 'TokenExpiredError') {
        return next(new UnauthorizedError('Token expired. Please refresh session.'));
      }
      return next(new UnauthorizedError('Invalid authentication token'));
    }

    // Verify user exists and is active
    const user = await User.findById(decoded.userId).populate('branchId', 'name code');
    if (!user) {
      return next(new UnauthorizedError('User belonging to this token no longer exists'));
    }

    if (!user.isActive) {
      return next(new ForbiddenError('User account has been deactivated'));
    }

    if (user.isAccountLocked()) {
      return next(new ForbiddenError('Account is temporarily locked'));
    }

    // Attach permissions
    const permissions = await RbacService.getPermissionsForRole(user.role);

    req.user = {
      _id: user._id,
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      role: user.role,
      branchId: user.branchId?._id?.toString() || null,
      branch: user.branchId,
      branches: user.branches || [],
      permissions
    };

    next();
  } catch (error) {
    next(error);
  }
};
