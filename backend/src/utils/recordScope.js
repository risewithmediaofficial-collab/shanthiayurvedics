import { ROLES } from '../constants/roles.js';
import { AppError, NotFoundError } from './errors.js';

const idOf = (value) => (value?._id || value)?.toString();

// Use the same scope for list, detail, export and mutation paths, including bulk jobs.
export const recordScope = (user, req, ownershipField) => {
  const scope = {};
  const branchId = req?.branchScope?.branchId || user?.branchId || user?.branches?.[0];
  const isGlobal = user?.role === ROLES.OWNER && req?.branchScope?.isGlobal !== false;
  if (!isGlobal && branchId) scope.branchId = idOf(branchId);
  if (user?.role === ROLES.TELECALLER && ownershipField) {
    scope[ownershipField] = idOf(user.id || user._id);
  }
  return scope;
};

export const assertRecordAccess = (record, user, req, ownershipField, label = 'Record') => {
  if (!record) throw new NotFoundError(label);
  const scope = recordScope(user, req, ownershipField);
  if (Object.entries(scope).some(([key, value]) => idOf(record[key]) !== value)) {
    throw new NotFoundError(label);
  }
  return record;
};

export const assertBranchAccess = (branchId, user, req) => {
  const scope = recordScope(user, req);
  if (scope.branchId && idOf(branchId) !== scope.branchId) {
    throw new AppError('The selected branch is outside your access scope', 403);
  }
};

export const assertTelecallerBranch = (telecaller, branchId) => {
  const primaryBranch = telecaller?.branchId || telecaller?.branches?.[0];
  if (!telecaller || telecaller.role !== ROLES.TELECALLER || !telecaller.isActive || idOf(primaryBranch) !== idOf(branchId)) {
    throw new AppError('Choose an active telecaller assigned to this branch', 400);
  }
};
