import { Router } from 'express';
import {
  getCustomers,
  getCustomerById,
  convertLead,
  addCustomerAddress,
  updateCustomer,
  deleteCustomer
} from '../controllers/customerController.js';
import { authenticate } from '../middleware/auth.js';
import { requirePermission } from '../middleware/rbac.js';
import { requireBranchScope } from '../middleware/branchScope.js';
import { PERMISSIONS } from '../constants/permissions.js';

const router = Router();

router.use(authenticate);
router.use(requireBranchScope);

router.get('/', requirePermission(PERMISSIONS.CUSTOMERS_VIEW), getCustomers);
router.get('/:id', requirePermission(PERMISSIONS.CUSTOMERS_VIEW), getCustomerById);
router.patch('/:id', requirePermission(PERMISSIONS.CUSTOMERS_EDIT), updateCustomer);
router.put('/:id', requirePermission(PERMISSIONS.CUSTOMERS_EDIT), updateCustomer);
router.delete('/:id', requirePermission(PERMISSIONS.CUSTOMERS_EDIT), deleteCustomer);
router.post('/convert-lead/:leadId', requirePermission(PERMISSIONS.CUSTOMERS_CREATE), convertLead);
router.post('/:id/addresses', requirePermission(PERMISSIONS.CUSTOMERS_EDIT), addCustomerAddress);

export default router;
