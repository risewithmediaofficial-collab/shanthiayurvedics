import { Router } from 'express';
import { getFollowups, completeFollowup } from '../controllers/followupController.js';
import { authenticate } from '../middleware/auth.js';
import { requirePermission } from '../middleware/rbac.js';
import { requireBranchScope } from '../middleware/branchScope.js';
import { PERMISSIONS } from '../constants/permissions.js';

const router = Router();

router.use(authenticate);
router.use(requireBranchScope);

router.get('/', requirePermission(PERMISSIONS.FOLLOWUPS_VIEW), getFollowups);
router.patch('/:id/complete', requirePermission(PERMISSIONS.FOLLOWUPS_COMPLETE), completeFollowup);

export default router;
