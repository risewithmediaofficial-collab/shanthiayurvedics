import { Router } from 'express';
import {
  getIntegrations,
  handleMetaWebhook,
  updateCourierCredentials
} from '../controllers/integrationController.js';
import { authenticate } from '../middleware/auth.js';
import { requirePermission } from '../middleware/rbac.js';
import { PERMISSIONS } from '../constants/permissions.js';

const router = Router();

// Public Webhook for Meta Lead Ads
router.all('/webhooks/meta', handleMetaWebhook);

// Protected Integration Management
router.use(authenticate);
router.get('/', requirePermission(PERMISSIONS.INTEGRATIONS_MANAGE), getIntegrations);
router.post('/courier', requirePermission(PERMISSIONS.INTEGRATIONS_MANAGE), updateCourierCredentials);

export default router;
