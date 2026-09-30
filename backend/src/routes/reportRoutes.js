import { Router } from 'express';
import {
  getSalesReport,
  getLeadReport,
  getDeliveryReport,
  getTCSalesSalary,
  getTillDateWithdrawal,
  createWithdrawalRequest,
  settleWithdrawalRequest
} from '../controllers/reportController.js';
import { authenticate } from '../middleware/auth.js';
import { requirePermission, requireRole } from '../middleware/rbac.js';
import { ROLES } from '../constants/roles.js';
import { requireBranchScope } from '../middleware/branchScope.js';
import { PERMISSIONS } from '../constants/permissions.js';

const router = Router();

router.use(authenticate);
router.use(requireBranchScope);

router.get('/sales', requirePermission(PERMISSIONS.REPORTS_VIEW), getSalesReport);
router.get('/leads', requirePermission(PERMISSIONS.REPORTS_VIEW), getLeadReport);
router.get('/delivery', requirePermission(PERMISSIONS.REPORTS_VIEW), getDeliveryReport);
router.get('/tc-salary', requirePermission(PERMISSIONS.REPORTS_VIEW), getTCSalesSalary);
router.get('/till-date-withdrawal', requirePermission(PERMISSIONS.REPORTS_VIEW), getTillDateWithdrawal);
router.post('/withdrawal-request', requireRole(ROLES.MANAGER), requirePermission(PERMISSIONS.REPORTS_VIEW), createWithdrawalRequest);
router.patch('/withdrawal-request/:id', requireRole(ROLES.OWNER), settleWithdrawalRequest);

export default router;

