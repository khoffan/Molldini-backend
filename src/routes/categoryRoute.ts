import { Router } from "express";
import { getAllCategory, getCategoryById, setCategory, deleteCategory } from '../controller/categoryController';

const router = Router();

/**
 * @openapi
 * /api/v1/categories:
 *   get:
 *     summary: ดึงรายการหมวดหมู่ทั้งหมด
 *     tags: [Categories]
 *     responses:
 *       200:
 *         description: OK
 */
router.get("/categories", getAllCategory);

/**
 * @openapi
 * /api/v1/categories/{id}:
 *   get:
 *     summary: ดึงข้อมูลหมวดหมู่ตาม ID
 *     tags: [Categories]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: OK
 *       404:
 *         description: Category not found
 */
router.get("/categories/:id", getCategoryById);

/**
 * @openapi
 * /api/v1/categories:
 *   post:
 *     summary: สร้างหมวดหมู่ใหม่
 *     tags: [Categories]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *     responses:
 *       201:
 *         description: Category created
 *       400:
 *         description: Bad request
 */
router.post("/categories", setCategory);

/**
 * @openapi
 * /api/v1/categories/{id}:
 *   delete:
 *     summary: ลบหมวดหมู่ตาม ID
 *     tags: [Categories]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Category deleted
 *       404:
 *         description: Category not found
 */
router.delete("/categories/:id", deleteCategory);

export default router;