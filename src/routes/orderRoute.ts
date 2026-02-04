import { Router } from 'express';
import { setOrder, getOrderById } from '../controller/orderController';

const router = Router();

router.post("/orders", setOrder);
router.get("/orders/:id", getOrderById);

export default router;