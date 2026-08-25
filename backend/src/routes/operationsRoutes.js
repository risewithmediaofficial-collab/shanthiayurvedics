import { Router } from 'express';
import {
  getOperationsSummary,
  packOrder,
  getPackingRecords
} from '../controllers/operationsController.js';
import { authenticate } from '../middleware/auth.js';
import { requirePermission } from '../middleware/rbac.js';
import { requireBranchScope } from '../middleware/branchScope.js';
import { PERMISSIONS } from '../constants/permissions.js';

const router = Router();

router.use(authenticate);
router.use(requireBranchScope);

router.get('/summary', requirePermission(PERMISSIONS.OPERATIONS_VIEW), getOperationsSummary);
router.get('/packing-records', requirePermission(PERMISSIONS.OPERATIONS_VIEW), getPackingRecords);
router.post('/orders/:orderId/pack', requirePermission(PERMISSIONS.ORDERS_PACK), packOrder);

export default router;
