import { Router } from 'express';
import {
  getProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
} from '../controllers/productController';
import { authMiddleware } from '../middlewares/authMiddleware';
import { roleMiddleware } from '../middlewares/roleMiddleware';
import { cacheMiddleware } from '../middlewares/cacheMiddleware';

const router = Router();

router.use(authMiddleware);

// GET routes with Redis Caching (TTL: 60s)
router.get('/', cacheMiddleware(60), getProducts);
router.get('/:id', cacheMiddleware(60), getProductById);

// Admin-only mutation routes
router.post('/', roleMiddleware(['ADMIN']), createProduct);
router.put('/:id', roleMiddleware(['ADMIN']), updateProduct);
router.delete('/:id', roleMiddleware(['ADMIN']), deleteProduct);

export default router;
