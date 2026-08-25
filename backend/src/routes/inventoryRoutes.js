import { Router } from 'express';
import {
  getInventory,
  getStockMovements,
  stockIn,
  stockOut,
  adjustStock,
  getStockTransfers,
  createStockTransfer,
  dispatchStockTransfer,
  receiveStockTransfer
} from '../controllers/inventoryController.js';
import { authenticate } from '../middleware/auth.js';
import { requirePermission } from '../middleware/rbac.js';
import { requireBranchScope } from '../middleware/branchScope.js';
import { PERMISSIONS } from '../constants/permissions.js';

const router = Router();

router.use(authenticate);
router.use(requireBranchScope);

router.get('/', requirePermission(PERMISSIONS.INVENTORY_VIEW), getInventory);
router.get('/movements', requirePermission(PERMISSIONS.INVENTORY_VIEW), getStockMovements);
router.post('/in', requirePermission(PERMISSIONS.INVENTORY_MANAGE), stockIn);
router.post('/out', requirePermission(PERMISSIONS.INVENTORY_MANAGE), stockOut);
router.post('/adjust', requirePermission(PERMISSIONS.INVENTORY_ADJUST), adjustStock);

// Transfers
router.get('/transfers', requirePermission(PERMISSIONS.INVENTORY_TRANSFER), getStockTransfers);
router.post('/transfers', requirePermission(PERMISSIONS.INVENTORY_TRANSFER), createStockTransfer);
router.patch('/transfers/:id/dispatch', requirePermission(PERMISSIONS.INVENTORY_TRANSFER), dispatchStockTransfer);
router.patch('/transfers/:id/receive', requirePermission(PERMISSIONS.INVENTORY_TRANSFER), receiveStockTransfer);

export default router;
