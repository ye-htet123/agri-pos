import { Router } from 'express';
import {
  getCustomers,
  lookupCustomer,
  getCustomerDetail,
  bulkDeleteCustomers,
  updateCustomer,
} from '../controllers/customerController';
import { authMiddleware } from '../middlewares/authMiddleware';
import { roleMiddleware } from '../middlewares/roleMiddleware';
import { cacheMiddleware } from '../middlewares/cacheMiddleware';

const router = Router();

router.use(authMiddleware, roleMiddleware(['ADMIN', 'CASHIER']));

// Static segments must be registered before the /:id detail route
router.get('/', cacheMiddleware(30), getCustomers);
router.get('/lookup', lookupCustomer);
router.post('/bulk-delete', roleMiddleware(['ADMIN']), bulkDeleteCustomers);
router.put('/:id', roleMiddleware(['ADMIN']), updateCustomer);
router.get('/:id', cacheMiddleware(30), getCustomerDetail);

export default router;
