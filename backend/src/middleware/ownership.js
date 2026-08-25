import { ROLES } from '../constants/roles.js';
import { ForbiddenError } from '../utils/errors.js';

export const checkOwnership = (resourceField = 'assignedTo') => (req, res, next) => {
  if (!req.user) {
    return next(new ForbiddenError('Authentication required'));
  }

  // Owner and Managers can access records within their branch scope
  if (req.user.role === ROLES.OWNER || req.user.role === ROLES.MANAGER || req.user.role === ROLES.DISTRIBUTOR) {
    return next();
  }

  // Telecaller is restricted to own records
  if (req.user.role === ROLES.TELECALLER) {
    // If request contains query filter, force assignedTo = user.id
    req.ownershipFilter = { [resourceField]: req.user.id };
  }

  next();
};
