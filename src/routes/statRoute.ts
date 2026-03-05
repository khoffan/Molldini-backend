import { Router } from 'express';
import { getMerchantStats, getOrderProductStats, getOrderState, getUserStats } from '../controller/statController';
import { checkAuth, isAdmin } from '../middleware/authMiddleware';

const router = Router();

router.get("/stats/order", checkAuth, isAdmin, getOrderState);
router.get("/stats/user", checkAuth, isAdmin, getUserStats);
router.get("/stats/merchant", checkAuth, isAdmin, getMerchantStats);
router.get("/stats/order-product", checkAuth, isAdmin, getOrderProductStats);

export default router;