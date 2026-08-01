import { Router } from 'express';
import { getStoreSettings, updateStoreSettings } from '../controllers/settingController';
import { authMiddleware } from '../middlewares/authMiddleware';
import { roleMiddleware } from '../middlewares/roleMiddleware';

const router = Router();

router.use(authMiddleware);
router.get('/', getStoreSettings);
router.put('/', roleMiddleware(['ADMIN']), updateStoreSettings);

export default router;
