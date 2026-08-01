import { Router } from 'express';
import { login, refreshToken, logout, getCurrentUser } from '../controllers/authController';
import { authMiddleware } from '../middlewares/authMiddleware';
import { authRateLimiter } from '../middlewares/rateLimiter';

const router = Router();

router.post('/login', authRateLimiter, login);
router.post('/refresh', refreshToken);
router.post('/logout', authMiddleware, logout);
router.get('/me', authMiddleware, getCurrentUser);

export default router;
