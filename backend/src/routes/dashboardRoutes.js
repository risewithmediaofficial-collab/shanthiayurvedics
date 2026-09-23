import { Router } from 'express';
import { getDashboardData, purgeFakeData } from '../controllers/dashboardController.js';
import { authenticate } from '../middleware/auth.js';
import { requireBranchScope } from '../middleware/branchScope.js';

const router = Router();

router.use(authenticate);
router.use(requireBranchScope);

router.get('/', getDashboardData);
router.post('/purge-fake-data', purgeFakeData);

export default router;
