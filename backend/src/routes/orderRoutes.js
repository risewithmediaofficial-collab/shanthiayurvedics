import { Router } from 'express';
import {
  getOrders,
  getOrderById,
  createOrder,
  transitionOrderStatus,
  bulkTransitionOrders,
  bulkAssignVerification,
  bulkVerifyOrders,
  autoDispatchOrders,
  importExcelOrders,
  exportOrders,
  getOrderMetricsSummary,
  getDistinctDistricts,
  updateOrder,
  deleteOrder
} from '../controllers/orderController.js';
import { authenticate } from '../middleware/auth.js';
import { requirePermission } from '../middleware/rbac.js';
import { requireBranchScope } from '../middleware/branchScope.js';
import { PERMISSIONS } from '../constants/permissions.js';

const router = Router();

router.use(authenticate);
router.use(requireBranchScope);

// General & Metrics
router.get('/', requirePermission(PERMISSIONS.ORDERS_VIEW), getOrders);
router.get('/metrics-summary', requirePermission(PERMISSIONS.ORDERS_VIEW), getOrderMetricsSummary);
router.get('/districts', requirePermission(PERMISSIONS.ORDERS_VIEW), getDistinctDistricts);
router.get('/export', requirePermission(PERMISSIONS.ORDERS_VIEW), exportOrders);

// Bulk Actions & Automations
router.patch('/bulk-status', requirePermission(PERMISSIONS.ORDERS_PROCESS), bulkTransitionOrders);
router.patch('/bulk-assign', requirePermission(PERMISSIONS.ORDERS_PROCESS), bulkAssignVerification);
router.patch('/bulk-verify', requirePermission(PERMISSIONS.ORDERS_PROCESS), bulkVerifyOrders);
router.post('/auto-dispatch', requirePermission(PERMISSIONS.ORDERS_PROCESS), autoDispatchOrders);
router.post('/import-excel', requirePermission(PERMISSIONS.ORDERS_CREATE), importExcelOrders);

// Single Order Operations
router.post('/', requirePermission(PERMISSIONS.ORDERS_CREATE), createOrder);
router.get('/:id', requirePermission(PERMISSIONS.ORDERS_VIEW), getOrderById);
router.patch('/:id/transition', requirePermission(PERMISSIONS.ORDERS_PROCESS), transitionOrderStatus);
router.patch('/:id', requirePermission(PERMISSIONS.ORDERS_EDIT), updateOrder);
router.put('/:id', requirePermission(PERMISSIONS.ORDERS_EDIT), updateOrder);
router.delete('/:id', requirePermission(PERMISSIONS.ORDERS_DELETE), deleteOrder);

export default router;
