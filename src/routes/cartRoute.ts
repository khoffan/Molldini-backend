import { Router } from "express";
import { addToCart, deleteCartItem, getCartItemById, getCartItems, updateCartItem } from "../controller/cartController";
import { checkAuth } from "../middleware/authMiddleware";
const router = Router();

router.post("/carts", checkAuth, addToCart);
router.get("/carts", checkAuth, getCartItems);
router.get("/carts/:id", checkAuth, getCartItemById);
router.put("/carts/:id", checkAuth, updateCartItem);
router.delete("/carts/:id", checkAuth, deleteCartItem);

export default router;