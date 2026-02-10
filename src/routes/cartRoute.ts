import { Router } from "express";
import { addToCart, deleteCartItem, getCartItemById, getCartItems, updateDecrementedCartItem, updateIncrementCartItem } from "../controller/cartController";
import { checkAuth } from "../middleware/authMiddleware";
const router = Router();

/**
 * @openapi
 * /api/v1/carts:
 *   post:
 *     summary: เพิ่มสินค้าไปยังตะกร้า
 *     tags: [Carts]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               productId:
 *                 type: string
 *               quantity:
 *                 type: number
 *     responses:
 *       201:
 *         description: Cart item created
 *       400:
 *         description: Bad request
 *       401:
 *         description: Unauthorized
 */
router.post("/carts", checkAuth, addToCart);

/**
 * @openapi
 * /api/v1/carts:
 *   get:
 *     summary: ดึงรายการสินค้าในตะกร้าของผู้ใช้
 *     tags: [Carts]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: OK
 *       401:
 *         description: Unauthorized
 */
router.get("/carts", checkAuth, getCartItems);

/**
 * @openapi
 * /api/v1/carts/{id}:
 *   get:
 *     summary: ดึงข้อมูลสินค้าในตะกร้าตาม ID
 *     tags: [Carts]
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
 *         description: OK
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Cart item not found
 */
router.get("/carts/:id", checkAuth, getCartItemById);

/**
 * @openapi
 * /api/v1/carts/increament/{id}:
 *   put:
 *     summary: อัปเดตเพิ่มจำนวนสินค้าในตะกร้า
 *     tags: [Carts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               quantity:
 *                 type: number
 *     responses:
 *       200:
 *         description: Cart item updated
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Cart item not found
 */
router.put("/carts/increament", checkAuth, updateIncrementCartItem);

/**
 * @openapi
 * /api/v1/carts/decreament/{id}:
 *   put:
 *     summary: อัปเดตลดจำนวนสินค้าในตะกร้า
 *     tags: [Carts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               quantity:
 *                 type: number
 *     responses:
 *       200:
 *         description: Cart item updated
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Cart item not found
 */
router.put("/carts/decreament", checkAuth, updateDecrementedCartItem);

/**
 * @openapi
 * /api/v1/carts/{id}:
 *   delete:
 *     summary: ลบสินค้าออกจากตะกร้า
 *     tags: [Carts]
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
 *         description: Cart item deleted
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Cart item not found
 */
router.delete("/carts/:id", checkAuth, deleteCartItem);

export default router;