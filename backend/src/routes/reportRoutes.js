import { Router } from 'express';
import {
  getSalesReport,
  getLeadReport,
  getDeliveryReport
} from '../controllers/reportController.js';
import { authenticate } from '../middleware/auth.js';
import { requirePermission } from '../middleware/rbac.js';
import { requireBranchScope } from '../middleware/branchScope.js';
import { PERMISSIONS } from '../constants/permissions.js';

const router = Router();

router.use(authenticate);
router.use(requireBranchScope);

router.get('/sales', requirePermission(PERMISSIONS.REPORTS_VIEW), getSalesReport);
router.get('/leads', requirePermission(PERMISSIONS.REPORTS_VIEW), getLeadReport);
router.get('/delivery', requirePermission(PERMISSIONS.REPORTS_VIEW), getDeliveryReport);

export default router;
