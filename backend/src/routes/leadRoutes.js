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
  getCallHistory
} from '../controllers/leadController.js';
import { authenticate } from '../middleware/auth.js';
import { requirePermission } from '../middleware/rbac.js';
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

router.get('/', requirePermission(PERMISSIONS.LEADS_VIEW), getLeads);
router.get('/calls/history', requirePermission(PERMISSIONS.LEADS_VIEW), getCallHistory);
router.post('/', requirePermission(PERMISSIONS.LEADS_CREATE), validate(createLeadSchema), createLead);
router.post('/bulk-assign', requirePermission(PERMISSIONS.LEADS_ASSIGN), bulkAssignLeads);
router.get('/:id', requirePermission(PERMISSIONS.LEADS_VIEW), getLeadById);
router.patch('/:id', requirePermission(PERMISSIONS.LEADS_EDIT), validate(updateLeadSchema), updateLead);
router.delete('/:id', requirePermission(PERMISSIONS.LEADS_EDIT), deleteLead);
router.post('/:id/calls', requirePermission(PERMISSIONS.LEADS_EDIT), validate(logCallSchema), logCall);
router.post('/:id/assign', requirePermission(PERMISSIONS.LEADS_ASSIGN), validate(assignLeadSchema), assignLead);

export default router;
