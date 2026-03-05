import { Router } from "express";
import { createShippingIntent, deleteShipping, getAllShipping, getShippingById } from "../controller/shippingController";
import { checkAuth, isAdmin } from "../middleware/authMiddleware";

const router = Router();

router.post("/shippings", checkAuth, isAdmin, createShippingIntent);
router.get("/shippings", checkAuth, getAllShipping);
router.get("/shippings/:id", checkAuth, getShippingById);
router.patch("/shippings/:id/update", checkAuth, isAdmin, deleteShipping);
router.delete("/shippings/:id/delete", checkAuth, isAdmin, deleteShipping);

export default router;