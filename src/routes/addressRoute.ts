import { Router } from "express";
import { setAddress, getAllAddress, getAddresById } from '../controller/addressController'

const router = Router();

/**
 * @openapi
 * /api/v1/addresses:
 *   get:
 *     summary: ดึงรายการที่อยู่ทั้งหมดของผู้ใช้
 *     tags: [Addresses]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: OK
 *       401:
 *         description: Unauthorized
 */
router.get("/addresses", getAllAddress);

/**
 * @openapi
 * /api/v1/addresses/{id}:
 *   get:
 *     summary: ดึงข้อมูลที่อยู่ตาม ID
 *     tags: [Addresses]
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
 *         description: Address not found
 */
router.get("/addresses/:id", getAddresById);

/**
 * @openapi
 * /api/v1/addresses:
 *   post:
 *     summary: เพิ่มที่อยู่ใหม่
 *     tags: [Addresses]
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
 *               phone:
 *                 type: string
 *               addressLine:
 *                 type: string
 *               city:
 *                 type: string
 *               postalCode:
 *                 type: string
 *     responses:
 *       201:
 *         description: Address created
 *       400:
 *         description: Bad request
 *       401:
 *         description: Unauthorized
 */
router.post("/addresses", setAddress);

export default router;