import { Router } from 'express';
import { createOrder, getOrders, getTodaySummary } from '../controllers/orderController';
import { authMiddleware } from '../middlewares/authMiddleware';
import { cacheMiddleware } from '../middlewares/cacheMiddleware';

const router = Router();

router.use(authMiddleware);

router.post('/', createOrder);
router.get('/', cacheMiddleware(30), getOrders);
router.get('/today-summary', cacheMiddleware(30), getTodaySummary);

export default router;
