import { Router } from 'express';
import { getRoles, getPermissions, updateRolePermissions } from '../controllers/roleController.js';
import { authenticate } from '../middleware/auth.js';
import { requirePermission } from '../middleware/rbac.js';
import { PERMISSIONS } from '../constants/permissions.js';

const router = Router();

router.use(authenticate);

router.get('/', requirePermission(PERMISSIONS.ROLES_MANAGE), getRoles);
router.get('/permissions', requirePermission(PERMISSIONS.PERMISSIONS_MANAGE), getPermissions);
router.patch('/:roleName', requirePermission(PERMISSIONS.ROLES_MANAGE), updateRolePermissions);

export default router;
