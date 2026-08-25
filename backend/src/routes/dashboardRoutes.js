import { Router } from 'express';
import { getDashboardData } from '../controllers/dashboardController.js';
import { authenticate } from '../middleware/auth.js';
import { requireBranchScope } from '../middleware/branchScope.js';

const router = Router();

router.use(authenticate);
router.use(requireBranchScope);

router.get('/', getDashboardData);

export default router;
