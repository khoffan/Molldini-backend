import { Router } from "express";
import { createPaymentIntent, deletePayment, getAllPayment, getPaymentById, togglePaymentStatus, updatePaymentIntent } from "../controller/paymentContoller";
import { checkAuth, isAdmin } from "../middleware/authMiddleware";

const router = Router();

router.post('/payments', checkAuth, isAdmin, createPaymentIntent);
router.get('/payments', checkAuth, getAllPayment);
router.get('/payments/:id', checkAuth, getPaymentById);
router.put('/payments/:id/update', checkAuth, isAdmin, updatePaymentIntent);
router.patch('/payments/:id/status', checkAuth, isAdmin, togglePaymentStatus);
router.delete('/payments/:id/delete', checkAuth, isAdmin, deletePayment);



export default router;