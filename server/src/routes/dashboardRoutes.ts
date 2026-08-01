import { Router } from 'express';
import { getDashboardStats } from '../controllers/dashboardController';
import { authMiddleware } from '../middlewares/authMiddleware';
import { roleMiddleware } from '../middlewares/roleMiddleware';
import { cacheMiddleware } from '../middlewares/cacheMiddleware';

const router = Router();

router.use(authMiddleware, roleMiddleware(['ADMIN', 'CASHIER']));

router.get('/', cacheMiddleware(30), getDashboardStats);
router.get('/stats', cacheMiddleware(30), getDashboardStats);

export default router;
