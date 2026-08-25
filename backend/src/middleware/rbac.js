import { ForbiddenError } from '../utils/errors.js';
import { ROLES } from '../constants/roles.js';

/**
 * Middleware to require a specific permission
 */
export const requirePermission = (permission) => (req, res, next) => {
  if (!req.user) {
    return next(new ForbiddenError('User not authenticated'));
  }

  // Owner bypasses all permission checks
  if (req.user.role === ROLES.OWNER) {
    return next();
  }

  const userPermissions = Array.isArray(req.user.permissions) ? req.user.permissions : [];
  if (!userPermissions.includes(permission)) {
    return next(
      new ForbiddenError(`Forbidden: Missing required permission '${permission}'`)
    );
  }

  next();
};

/**
 * Middleware to require any of the specified permissions
 */
export const requireAnyPermission = (permissions = []) => (req, res, next) => {
  if (!req.user) {
    return next(new ForbiddenError('User not authenticated'));
  }

  if (req.user.role === ROLES.OWNER) {
    return next();
  }

  const userPermissions = Array.isArray(req.user.permissions) ? req.user.permissions : [];
  const hasOne = permissions.some((perm) => userPermissions.includes(perm));

  if (!hasOne) {
    return next(
      new ForbiddenError(`Forbidden: Requires at least one of [${permissions.join(', ')}]`)
    );
  }

  next();
};

/**
 * Middleware to require specific roles
 */
export const requireRole = (...roles) => (req, res, next) => {
  if (!req.user) {
    return next(new ForbiddenError('User not authenticated'));
  }

  if (req.user.role === ROLES.OWNER || roles.includes(req.user.role)) {
    return next();
  }

  return next(new ForbiddenError(`Forbidden: Role must be one of [${roles.join(', ')}]`));
};
