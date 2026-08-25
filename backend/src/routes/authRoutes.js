import { Router } from 'express';
import { login, refresh, logout, getMe, getSession, changePassword } from '../controllers/authController.js';
import { validate } from '../middleware/validate.js';
import { loginSchema, changePasswordSchema } from '../validators/authValidators.js';
import { authRateLimiter } from '../middleware/rateLimiter.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

router.post('/login', authRateLimiter, validate(loginSchema), login);
router.post('/refresh', authRateLimiter, refresh);
router.post('/logout', logout);
router.get('/session', getSession);

// Protected Auth Routes
router.get('/me', authenticate, getMe);
router.post('/change-password', authenticate, validate(changePasswordSchema), changePassword);

export default router;
