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

  // Non-Owner users (Managers, Distributors, Telecallers, Staff): strictly locked to their assigned branch
  const primaryBranchId = branchId
    ? branchId.toString()
    : Array.isArray(branches) && branches[0]
      ? branches[0]._id ? branches[0]._id.toString() : branches[0].toString()
      : null;

  if (!primaryBranchId) {
    return next(new ForbiddenError('User has no authorized branch assigned'));
  }

  // If frontend passed an explicit branch, it must match the user's single assigned branch
  if (isExplicitBranch && requestedBranch !== primaryBranchId) {
    return next(new ForbiddenError('Unauthorized branch access attempt. You are restricted to your assigned branch.'));
  }

  req.branchScope = {
    branchId: primaryBranchId,
    allowedBranchIds: [primaryBranchId],
    isGlobal: false
  };

  next();
};
