import { Router } from 'express';
import {
  getUsers,
  getUserById,
  createUser,
  updateUser,
  toggleUserStatus,
  adminResetPassword
} from '../controllers/userController.js';
import { authenticate } from '../middleware/auth.js';
import { requirePermission } from '../middleware/rbac.js';
import { validate } from '../middleware/validate.js';
import {
  createUserSchema,
  updateUserSchema,
  adminResetPasswordSchema
} from '../validators/userValidators.js';
import { PERMISSIONS } from '../constants/permissions.js';

const router = Router();

router.use(authenticate);

router.get('/', requirePermission(PERMISSIONS.USERS_VIEW), getUsers);
router.post('/', requirePermission(PERMISSIONS.USERS_CREATE), validate(createUserSchema), createUser);
router.get('/:id', requirePermission(PERMISSIONS.USERS_VIEW), getUserById);
router.patch('/:id', requirePermission(PERMISSIONS.USERS_EDIT), validate(updateUserSchema), updateUser);
router.patch('/:id/toggle-status', requirePermission(PERMISSIONS.USERS_DISABLE), toggleUserStatus);
router.post('/:id/reset-password', requirePermission(PERMISSIONS.USERS_EDIT), validate(adminResetPasswordSchema), adminResetPassword);

export default router;
