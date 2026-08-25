import { Router } from 'express';
import {
  getShipments,
  createShipment,
  dispatchShipment,
  getTracking,
  addTrackingEvent,
  getCourierProviders
} from '../controllers/shippingController.js';
import { authenticate } from '../middleware/auth.js';
import { requirePermission } from '../middleware/rbac.js';
import { requireBranchScope } from '../middleware/branchScope.js';
import { PERMISSIONS } from '../constants/permissions.js';

const router = Router();

// Public Tracking (unauthenticated for customer tracking widget if needed)
router.get('/track/:awbNumber', getTracking);

router.use(authenticate);
router.use(requireBranchScope);

router.get('/', requirePermission(PERMISSIONS.SHIPPING_VIEW), getShipments);
router.get('/providers', requirePermission(PERMISSIONS.SHIPPING_VIEW), getCourierProviders);
router.post('/orders/:orderId/shipment', requirePermission(PERMISSIONS.SHIPPING_MANAGE), createShipment);
router.patch('/shipments/:id/dispatch', requirePermission(PERMISSIONS.SHIPPING_MANAGE), dispatchShipment);
router.post('/track/:awbNumber/events', requirePermission(PERMISSIONS.SHIPPING_MANAGE), addTrackingEvent);

export default router;
