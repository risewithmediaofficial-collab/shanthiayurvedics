import { ROLES } from '../constants/roles.js';
import { ForbiddenError } from '../utils/errors.js';

export const requireBranchScope = (req, res, next) => {
  if (!req.user) {
    return next(new ForbiddenError('Authentication required'));
  }

  const { role, branchId, branches } = req.user;

  if (role === ROLES.OWNER) {
    // Owner can request any branch or view ALL branches
    const requestedBranch = req.headers['x-branch-id'] || req.query.branchId;
    if (requestedBranch && requestedBranch !== 'ALL') {
      req.branchScope = { branchId: requestedBranch, isGlobal: false };
    } else {
      req.branchScope = { branchId: null, isGlobal: true };
    }
    return next();
  }

  // Non-Owner users: resolve their authorized branch(es)
  const allowedBranchIds = [];
  if (branchId) allowedBranchIds.push(branchId.toString());
  if (Array.isArray(branches)) {
    branches.forEach((b) => {
      const bId = b._id ? b._id.toString() : b.toString();
      if (!allowedBranchIds.includes(bId)) {
        allowedBranchIds.push(bId);
      }
    });
  }

  if (allowedBranchIds.length === 0) {
    return next(new ForbiddenError('User has no authorized branch assigned'));
  }

  // If frontend passed an explicit branch, check if the user is authorized for it
  const requestedBranch = req.headers['x-branch-id'] || req.query.branchId || req.body?.branchId;
  if (requestedBranch && requestedBranch !== 'ALL') {
    if (!allowedBranchIds.includes(requestedBranch.toString())) {
      return next(new ForbiddenError('Unauthorized branch access attempt'));
    }
    req.branchScope = {
      branchId: requestedBranch.toString(),
      allowedBranchIds,
      isGlobal: false
    };
  } else {
    // Default to their primary branch or all assigned branches
    req.branchScope = {
      branchId: allowedBranchIds[0],
      allowedBranchIds,
      isGlobal: false
    };
  }

  next();
};
