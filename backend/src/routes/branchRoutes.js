import { Router } from 'express';
import {
  getBranches,
  getAllBranchesAdmin,
  createBranch,
  updateBranch,
  deleteBranch,
  bulkDeleteBranches,
  getBranchCredentials,
  resetBranchUserPassword,
  createBranchAccount
} from '../controllers/branchController.js';
import { authenticate } from '../middleware/auth.js';
import { requirePermission } from '../middleware/rbac.js';
import { validate } from '../middleware/validate.js';
import { createBranchSchema } from '../validators/userValidators.js';
import { PERMISSIONS } from '../constants/permissions.js';

const router = Router();

router.use(authenticate);

// Publicly available to authenticated users (e.g. for branch filters/selectors)
router.get('/', getBranches);

// Admin Branch Management
router.get('/admin', requirePermission(PERMISSIONS.BRANCHES_MANAGE), getAllBranchesAdmin);
router.post('/bulk-delete', requirePermission(PERMISSIONS.BRANCHES_MANAGE), bulkDeleteBranches);
router.delete('/bulk-delete', requirePermission(PERMISSIONS.BRANCHES_MANAGE), bulkDeleteBranches);
router.post('/', requirePermission(PERMISSIONS.BRANCHES_MANAGE), validate(createBranchSchema), createBranch);

// Branch Credentials (Owner Only)
router.get('/:id/credentials', requirePermission(PERMISSIONS.BRANCHES_MANAGE), getBranchCredentials);
router.post('/:id/credentials/reset-password', requirePermission(PERMISSIONS.BRANCHES_MANAGE), resetBranchUserPassword);
router.post('/:id/credentials/create-account', requirePermission(PERMISSIONS.BRANCHES_MANAGE), createBranchAccount);

router.patch('/:id', requirePermission(PERMISSIONS.BRANCHES_MANAGE), updateBranch);
router.put('/:id', requirePermission(PERMISSIONS.BRANCHES_MANAGE), updateBranch);
router.delete('/:id', requirePermission(PERMISSIONS.BRANCHES_MANAGE), deleteBranch);

export default router;
