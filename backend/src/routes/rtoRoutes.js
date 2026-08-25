import { Router } from 'express';
import {
  getRTORecords,
  initiateRTO,
  markRTOReceived,
  verifyAndRecover
} from '../controllers/rtoController.js';
import { authenticate } from '../middleware/auth.js';
import { requirePermission } from '../middleware/rbac.js';
import { requireBranchScope } from '../middleware/branchScope.js';
import { PERMISSIONS } from '../constants/permissions.js';

const router = Router();

router.use(authenticate);
router.use(requireBranchScope);

router.get('/', requirePermission(PERMISSIONS.RTO_VIEW), getRTORecords);
router.post('/initiate', requirePermission(PERMISSIONS.RTO_MANAGE), initiateRTO);
router.patch('/:id/receive', requirePermission(PERMISSIONS.RTO_MANAGE), markRTOReceived);
router.patch('/:id/verify', requirePermission(PERMISSIONS.RTO_VERIFY), verifyAndRecover);

export default router;
