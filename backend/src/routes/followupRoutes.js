import { FollowUp } from '../models/FollowUp.js';
import { scopeRecord } from '../middleware/scopeRecord.js';
import { Router } from 'express';
import {
  getFollowups,
  completeFollowup,
  updateFollowup,
  deleteFollowup
} from '../controllers/followupController.js';
import { authenticate } from '../middleware/auth.js';
import { requirePermission } from '../middleware/rbac.js';
import { requireBranchScope } from '../middleware/branchScope.js';
import { PERMISSIONS } from '../constants/permissions.js';

const router = Router();

router.use(authenticate);
router.use(requireBranchScope);
router.param('id', scopeRecord(FollowUp, 'telecallerId'));

router.get('/', requirePermission(PERMISSIONS.FOLLOWUPS_VIEW), getFollowups);
router.patch('/:id', requirePermission(PERMISSIONS.FOLLOWUPS_EDIT), updateFollowup);
router.delete('/:id', requirePermission(PERMISSIONS.FOLLOWUPS_EDIT), deleteFollowup);
router.patch('/:id/complete', requirePermission(PERMISSIONS.FOLLOWUPS_COMPLETE), completeFollowup);

export default router;
