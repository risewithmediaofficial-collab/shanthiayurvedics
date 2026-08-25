import { Router } from 'express';
import { getAuditLogs, getLoginHistory } from '../controllers/auditController.js';
import { authenticate } from '../middleware/auth.js';
import { requirePermission } from '../middleware/rbac.js';
import { PERMISSIONS } from '../constants/permissions.js';

const router = Router();

router.use(authenticate);

router.get('/', requirePermission(PERMISSIONS.AUDIT_VIEW), getAuditLogs);
router.get('/login-history', requirePermission(PERMISSIONS.AUDIT_VIEW), getLoginHistory);

export default router;
