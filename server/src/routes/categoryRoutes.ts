import { Router } from 'express';
import {
  getCategories,
  createCategory,
  updateCategory,
  deleteCategory,
} from '../controllers/categoryController';
import { authMiddleware } from '../middlewares/authMiddleware';
import { roleMiddleware } from '../middlewares/roleMiddleware';
import { cacheMiddleware } from '../middlewares/cacheMiddleware';

const router = Router();

router.use(authMiddleware);

// GET categories with Redis caching (TTL: 60s)
router.get('/', cacheMiddleware(60), getCategories);

// Admin-only mutation routes
router.post('/', roleMiddleware(['ADMIN']), createCategory);
router.put('/:id', roleMiddleware(['ADMIN']), updateCategory);
router.delete('/:id', roleMiddleware(['ADMIN']), deleteCategory);

export default router;
