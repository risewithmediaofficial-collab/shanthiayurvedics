import { Router } from 'express';
import {
  getOrders,
  getOrderById,
  createOrder,
  transitionOrderStatus
} from '../controllers/orderController.js';
import { authenticate } from '../middleware/auth.js';
import { requirePermission } from '../middleware/rbac.js';
import { requireBranchScope } from '../middleware/branchScope.js';
import { PERMISSIONS } from '../constants/permissions.js';

const router = Router();

router.use(authenticate);
router.use(requireBranchScope);

router.get('/', requirePermission(PERMISSIONS.ORDERS_VIEW), getOrders);
router.post('/', requirePermission(PERMISSIONS.ORDERS_CREATE), createOrder);
router.get('/:id', requirePermission(PERMISSIONS.ORDERS_VIEW), getOrderById);
router.patch('/:id/transition', requirePermission(PERMISSIONS.ORDERS_PROCESS), transitionOrderStatus);

export default router;
