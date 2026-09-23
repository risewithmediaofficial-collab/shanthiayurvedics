import { ROLES } from '../constants/roles.js';
import { ForbiddenError } from '../utils/errors.js';

export const requireBranchScope = (req, res, next) => {
  if (!req.user) {
    return next(new ForbiddenError('Authentication required'));
  }

  const { role, branchId, branches } = req.user;

  // Resolve requested branch from header, query, or body
  const rawRequested = (
    req.headers['x-branch-id'] ||
    req.headers['x-branch'] ||
    req.query?.branchId ||
    req.body?.branchId
  );
  const requestedBranch = rawRequested ? rawRequested.toString().trim() : null;
  const isExplicitBranch =
    requestedBranch &&
    requestedBranch !== 'ALL' &&
    requestedBranch !== 'null' &&
    requestedBranch !== 'undefined';

  if (role === ROLES.OWNER) {
    // Owner can request any branch or view ALL branches globally
    if (isExplicitBranch) {
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
  if (isExplicitBranch) {
    if (!allowedBranchIds.includes(requestedBranch)) {
      return next(new ForbiddenError('Unauthorized branch access attempt'));
    }
    req.branchScope = {
      branchId: requestedBranch,
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
