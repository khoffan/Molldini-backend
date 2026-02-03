import { Router } from "express";
import { getAllProducts, addProduct, getProductById } from "../controller/productController";

const router = Router();

router.get("/products", getAllProducts);
router.get("/products/:id", getProductById);
router.post("/products", addProduct);


export default router;
