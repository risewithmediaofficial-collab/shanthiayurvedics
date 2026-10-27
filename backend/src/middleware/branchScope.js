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

  if (role === ROLES.MANAGER) {
    const rawBranchIds = [
      ...(branchId ? [typeof branchId === 'object' ? (branchId._id || branchId.id) : branchId] : []),
      ...(Array.isArray(branches) ? branches.map(b => typeof b === 'object' ? (b._id || b.id) : b) : [])
    ].filter(Boolean);

    const assignedIds = [...new Set(rawBranchIds.map(id => id.toString()))];

    // Managers are strictly scoped to their assigned branch(es) and can NEVER have global scope
    if (assignedIds.length === 0) {
      req.branchScope = { branchId: null, allowedBranchIds: [], isGlobal: false, unassigned: true };
      return next();
    }

    // If explicit branch requested is within assigned branches, use it; otherwise safely default to their primary assigned branch
    if (isExplicitBranch && assignedIds.includes(requestedBranch)) {
      req.branchScope = { branchId: requestedBranch, allowedBranchIds: assignedIds, isGlobal: false };
    } else {
      req.branchScope = { branchId: assignedIds[0], allowedBranchIds: assignedIds, isGlobal: false };
    }
    return next();
  }

  // Other staff (Distributors, Telecallers): strictly locked to their single assigned branch
  const primaryBranchId = branchId
    ? branchId.toString()
    : Array.isArray(branches) && branches[0]
      ? branches[0]._id ? branches[0]._id.toString() : branches[0].toString()
      : null;

  if (!primaryBranchId) {
    // Allow requests through with an unassigned scope so read queries return empty datasets instead of throwing 403
    req.branchScope = { branchId: null, allowedBranchIds: [], isGlobal: false, unassigned: true };
    return next();
  }

  // Staff are strictly confined to their primary branch. Clamping guarantees security without throwing 403 on stale client headers.
  req.branchScope = {
    branchId: primaryBranchId,
    allowedBranchIds: [primaryBranchId],
    isGlobal: false
  };

  next();
};
