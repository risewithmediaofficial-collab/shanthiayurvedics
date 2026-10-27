import { Lead } from '../models/Lead.js';
import { scopeRecord } from '../middleware/scopeRecord.js';
import { Router } from 'express';
import {
  getLeads,
  getLeadById,
  createLead,
  updateLead,
  deleteLead,
  logCall,
  assignLead,
  bulkAssignLeads,
  bulkDeleteLeads,
  getCallHistory,
  getLeadCalls,
  deleteCallHistory
} from '../controllers/leadController.js';
import { authenticate } from '../middleware/auth.js';
import { requirePermission, requireAnyPermission } from '../middleware/rbac.js';
import { requireBranchScope } from '../middleware/branchScope.js';
import { validate } from '../middleware/validate.js';
import {
  createLeadSchema,
  updateLeadSchema,
  logCallSchema,
  assignLeadSchema
} from '../validators/leadValidators.js';
import { PERMISSIONS } from '../constants/permissions.js';

const router = Router();

router.use(authenticate);
router.use(requireBranchScope);

// Bulk routes & Call history (must be before :id param)
router.post('/bulk-assign', requirePermission(PERMISSIONS.LEADS_ASSIGN), bulkAssignLeads);
router.post('/bulk-delete', requirePermission(PERMISSIONS.LEADS_EDIT), bulkDeleteLeads);
router.delete('/bulk-delete', requirePermission(PERMISSIONS.LEADS_EDIT), bulkDeleteLeads);
router.get('/calls/history', requirePermission(PERMISSIONS.LEADS_VIEW), getCallHistory);
router.delete('/calls/history/:callId', requireAnyPermission([PERMISSIONS.LEADS_EDIT, PERMISSIONS.LEADS_DELETE]), deleteCallHistory);

router.param('id', scopeRecord(Lead, 'assignedTo'));

router.get('/', requirePermission(PERMISSIONS.LEADS_VIEW), getLeads);
router.post('/', requirePermission(PERMISSIONS.LEADS_CREATE), validate(createLeadSchema), createLead);
router.get('/:id', requirePermission(PERMISSIONS.LEADS_VIEW), getLeadById);
router.get('/:id/calls', requirePermission(PERMISSIONS.LEADS_VIEW), getLeadCalls);
router.patch('/:id', requirePermission(PERMISSIONS.LEADS_EDIT), validate(updateLeadSchema), updateLead);
router.delete('/:id', requirePermission(PERMISSIONS.LEADS_EDIT), deleteLead);
router.post('/:id/calls', requirePermission(PERMISSIONS.LEADS_EDIT), validate(logCallSchema), logCall);
router.post('/:id/assign', requirePermission(PERMISSIONS.LEADS_ASSIGN), validate(assignLeadSchema), assignLead);

export default router;
