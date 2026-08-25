import { Router } from 'express';
import { getProducts, getProductById, createProduct, addBatch } from '../controllers/productController.js';
import { authenticate } from '../middleware/auth.js';
import { requirePermission } from '../middleware/rbac.js';
import { PERMISSIONS } from '../constants/permissions.js';

const router = Router();

router.use(authenticate);

router.get('/', requirePermission(PERMISSIONS.PRODUCTS_VIEW), getProducts);
router.get('/:id', requirePermission(PERMISSIONS.PRODUCTS_VIEW), getProductById);
router.post('/', requirePermission(PERMISSIONS.PRODUCTS_CREATE), createProduct);
router.post('/:productId/batches', requirePermission(PERMISSIONS.PRODUCTS_EDIT), addBatch);

export default router;
