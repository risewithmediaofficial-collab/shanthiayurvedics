import { Customer } from '../models/Customer.js';
import { scopeRecord } from '../middleware/scopeRecord.js';
import { Router } from 'express';
import {
  getCustomers,
  getCustomerById,
  getCustomerByPhone,
  getReordersDue,
  triggerReorderCheck,
  convertLead,
  addCustomerAddress,
  updateCustomer,
  deleteCustomer,
  bulkDeleteCustomers
} from '../controllers/customerController.js';
import { authenticate } from '../middleware/auth.js';
import { requirePermission } from '../middleware/rbac.js';
import { requireBranchScope } from '../middleware/branchScope.js';
import { PERMISSIONS } from '../constants/permissions.js';

const router = Router();

router.use(authenticate);
router.use(requireBranchScope);

// Bulk routes (must be before :id)
router.post('/bulk-delete', requirePermission(PERMISSIONS.CUSTOMERS_EDIT), bulkDeleteCustomers);
router.delete('/bulk-delete', requirePermission(PERMISSIONS.CUSTOMERS_EDIT), bulkDeleteCustomers);

// Dedicated reorder and phone lookup routes (defined before :id to prevent collision)
router.get('/reorders-due', requirePermission(PERMISSIONS.CUSTOMERS_VIEW), getReordersDue);
router.get('/by-phone/:phone', requirePermission(PERMISSIONS.CUSTOMERS_VIEW), getCustomerByPhone);
router.post('/check-reorders', requirePermission(PERMISSIONS.CUSTOMERS_VIEW), triggerReorderCheck);

router.get('/', requirePermission(PERMISSIONS.CUSTOMERS_VIEW), getCustomers);
// Allow all roles (Owner, Manager, Telecaller, Distributor) with CUSTOMERS_VIEW to view customer profiles and order histories
router.get('/:id', requirePermission(PERMISSIONS.CUSTOMERS_VIEW), getCustomerById);

// Scoped mutations for edit/delete
router.patch('/:id', requirePermission(PERMISSIONS.CUSTOMERS_EDIT), updateCustomer);
router.put('/:id', requirePermission(PERMISSIONS.CUSTOMERS_EDIT), updateCustomer);
router.delete('/:id', requirePermission(PERMISSIONS.CUSTOMERS_EDIT), deleteCustomer);
router.post('/convert-lead/:leadId', requirePermission(PERMISSIONS.CUSTOMERS_CREATE), convertLead);
router.post('/:id/addresses', requirePermission(PERMISSIONS.CUSTOMERS_EDIT), addCustomerAddress);

export default router;
