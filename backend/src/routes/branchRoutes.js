import { Router } from 'express';
import {
  getBranches,
  getAllBranchesAdmin,
  createBranch,
  updateBranch
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
router.post('/', requirePermission(PERMISSIONS.BRANCHES_MANAGE), validate(createBranchSchema), createBranch);
router.patch('/:id', requirePermission(PERMISSIONS.BRANCHES_MANAGE), updateBranch);

export default router;
