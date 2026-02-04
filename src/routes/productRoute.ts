import { Router } from "express";
import { getAllProducts, addProduct, getProductById, } from "../controller/productController";
import { checkAuth, isMerchant } from "../middleware/authMiddleware";
const router = Router();

router.get("/products", getAllProducts);
router.get("/products/:id", getProductById);
router.post("/products", checkAuth, isMerchant, addProduct);


export default router;
