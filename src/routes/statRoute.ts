import { Router } from 'express';
import { getMerchantStats, getOrderProductStats, getOrderState, getOverviewState, getUserStats } from '../controller/statController';
import { checkAuth, isAdmin } from '../common/middleware/authMiddleware';

const router = Router();

router.get("/stats/overview", checkAuth, isAdmin, getOverviewState);
router.get("/stats/order", checkAuth, isAdmin, getOrderState);
router.get("/stats/user", checkAuth, isAdmin, getUserStats);
router.get("/stats/merchant", checkAuth, isAdmin, getMerchantStats);
router.get("/stats/order-product", checkAuth, isAdmin, getOrderProductStats);

export default router;