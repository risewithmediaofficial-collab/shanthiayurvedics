import { Router } from 'express';
import multer from 'multer';
import {
  getShipments,
  createShipment,
  dispatchShipment,
  getTracking,
  addTrackingEvent,
  getCourierProviders,
  importCourierStatus
} from '../controllers/shippingController.js';
import { authenticate } from '../middleware/auth.js';
import { requirePermission } from '../middleware/rbac.js';
import { requireBranchScope } from '../middleware/branchScope.js';
import { PERMISSIONS } from '../constants/permissions.js';

const router = Router();

// Multer — memory storage (no temp disk files); accept Excel, CSV and PDF only
const importUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB max
  fileFilter: (_req, file, cb) => {
    const allowed = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
      'application/vnd.ms-excel', // .xls
      'text/csv',
      'application/pdf',
    ];
    // Also accept by extension for browsers that send generic MIME
    const ext = file.originalname.split('.').pop().toLowerCase();
    if (allowed.includes(file.mimetype) || ['xlsx', 'xls', 'csv', 'pdf'].includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Only Excel (.xlsx/.xls/.csv) and PDF files are allowed.'));
    }
  },
});

// Public Tracking (unauthenticated for customer tracking widget if needed)
router.get('/track/:awbNumber', getTracking);

router.use(authenticate);
router.use(requireBranchScope);

router.get('/', requirePermission(PERMISSIONS.SHIPPING_VIEW), getShipments);
router.get('/providers', requirePermission(PERMISSIONS.SHIPPING_VIEW), getCourierProviders);
router.post('/orders/:orderId/shipment', requirePermission(PERMISSIONS.SHIPPING_MANAGE), createShipment);
router.patch('/shipments/:id/dispatch', requirePermission(PERMISSIONS.SHIPPING_MANAGE), dispatchShipment);
router.post('/track/:awbNumber/events', requirePermission(PERMISSIONS.SHIPPING_MANAGE), addTrackingEvent);
router.post('/import-status', requirePermission(PERMISSIONS.SHIPPING_MANAGE), importUpload.single('file'), importCourierStatus);

export default router;
