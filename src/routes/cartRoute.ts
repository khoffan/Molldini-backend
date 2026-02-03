import { Router } from "express";
import { addToCart, deleteCartItem, getCartItemById, getCartItems, updateCartItem } from "../controller/cartController";

const router = Router();

router.post("/carts", addToCart);
router.get("/carts", getCartItems);
router.get("/carts/:id", getCartItemById);
router.put("/carts/:id", updateCartItem);
router.delete("/carts/:id", deleteCartItem);

export default router;