import { Router } from "express";
import { getAllCategory, getCategoryById, setCategory, deleteCategory } from '../controller/categoryController';

const router = Router();

router.get("/categories", getAllCategory);
router.get("/categories/:id", getCategoryById);
router.post("/categories", setCategory);
router.delete("/categories/:id", deleteCategory);

export default router;