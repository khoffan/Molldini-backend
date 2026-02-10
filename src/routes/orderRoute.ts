import { Router } from 'express';
import { setOrder, getOrderById, updateOrderData } from '../controller/orderController';
import { checkAuth } from '../middleware/authMiddleware';

const router = Router();

/**
 * @openapi
 * /api/v1/orders:
 *   post:
 *     summary: สร้างคำสั่งซื้อใหม่
 *     tags: [Orders]
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
 *               address:
 *                 type: string
 *     responses:
 *       201:
 *         description: Order created
 *       400:
 *         description: Bad request
 */
router.post("/orders/from-cart/:cartId", checkAuth, setOrder);

/**
 * @openapi
 * /api/v1/orders/{id}:
 *   get:
 *     summary: ดึงข้อมูลคำสั่งซื้อตาม ID
 *     tags: [Orders]
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
 *       404:
 *         description: Order not found
 */
router.get("/orders/:id", checkAuth, getOrderById);

/**
 * @openapi
 * /api/v1/orders/{id}/payment:
 *   put:
 *     summary: อัปเดตสถานะการจ่ายเงินของคำสั่งซื้อ
 *     tags: [Orders]
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
 *               paymentStatus:
 *                 type: string
 *                 enum: [PAID, UNPAID]
 *     responses:
 *       200:
 *         description: OK
 *       404:
 *         description: Order not found
 */

router.put("/orders/:id/data/:cartId", checkAuth, updateOrderData);


export default router;