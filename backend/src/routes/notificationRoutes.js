import { Router } from 'express';
import {
  getNotifications,
  markRead,
  markAllRead,
  getVapidPublicKey,
  subscribePush,
  unsubscribePush,
  testPush,
  getPushSubscriptions,
  simulateLeadAssign,
  simulateFollowupDue,
  simulateReorderDue,
  triggerCycle
} from '../controllers/notificationController.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

// Public / auth-optional or authenticated route for VAPID public key
router.get('/vapid-public-key', getVapidPublicKey);

// Authenticated routes
router.use(authenticate);

router.get('/', getNotifications);
router.patch('/:id/read', markRead);
router.post('/read-all', markAllRead);

// Web Push endpoints
router.post('/subscribe', subscribePush);
router.post('/unsubscribe', unsubscribePush);
router.post('/test-push', testPush);
router.get('/subscriptions', getPushSubscriptions);

// Simulation & Testing Endpoints
router.post('/simulate-lead-assign', simulateLeadAssign);
router.post('/simulate-followup-due', simulateFollowupDue);
router.post('/simulate-reorder-due', simulateReorderDue);
router.post('/trigger-cycle', triggerCycle);

export default router;


