import { Router } from 'express';
import {
  getProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  addBatch,
  getCategories,
  createCategory,
  deleteCategory
} from '../controllers/productController.js';
import { authenticate } from '../middleware/auth.js';
import { requirePermission, requireRole } from '../middleware/rbac.js';
import { requireBranchScope } from '../middleware/branchScope.js';
import { PERMISSIONS } from '../constants/permissions.js';
import { ROLES } from '../constants/roles.js';

const router = Router();

router.use(authenticate);
router.use(requireBranchScope);

router.get('/categories', requirePermission(PERMISSIONS.PRODUCTS_VIEW), getCategories);
router.post('/categories', requireRole(ROLES.OWNER), createCategory);
router.delete('/categories/:id', requireRole(ROLES.OWNER), deleteCategory);

router.get('/', requirePermission(PERMISSIONS.PRODUCTS_VIEW), getProducts);
router.get('/:id', requirePermission(PERMISSIONS.PRODUCTS_VIEW), getProductById);
router.post('/', requireRole(ROLES.OWNER), createProduct);
router.post('/:id/batches', requireRole(ROLES.OWNER), addBatch);
router.patch('/:id', requireRole(ROLES.OWNER), updateProduct);
router.put('/:id', requireRole(ROLES.OWNER), updateProduct);
router.delete('/:id', requireRole(ROLES.OWNER), deleteProduct);

export default router;
