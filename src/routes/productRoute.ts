import { Router } from "express";
import { getAllProducts, addProduct, getProductById, getMerchantProducts } from "../controller/productController";
import { checkAuth, isMerchant } from "../middleware/authMiddleware";
const router = Router();

router.get("/products", getAllProducts);
router.get("/products/:id", getProductById);
router.get("/products/merchant", checkAuth, isMerchant, getMerchantProducts);
router.post("/products", checkAuth, isMerchant, addProduct);


export default router;
