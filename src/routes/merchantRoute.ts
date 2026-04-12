import { Router } from "express";
import { addMerchant, getAllMerchants, getMerchantById, updateMerchant } from "../controller/merchantController";
import { checkAuth, isMerchant } from "../common/middleware/authMiddleware";
const router = Router();

/**
 * @openapi
 * /api/v1/merchants:
 *   post:
 *     summary: สร้างข้อมูลร้านค้าใหม่ของผู้ใช้
 *     tags: [Merchants]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       201:
 *         description: Merchant created
 *       400:
 *         description: Bad request
 */
router.post("/merchants", checkAuth, addMerchant);

/**
 * @openapi
 * /api/v1/merchants:
 *   get:
 *     summary: ดึงรายการร้านค้าทั้งหมด (เฉพาะ Merchant)
 *     tags: [Merchants]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: OK
 *       403:
 *         description: Forbidden
 */
router.get("/merchants", checkAuth, isMerchant, getAllMerchants);

/**
 * @openapi
 * /api/v1/merchants/me:
 *   get:
 *     summary: ดึงข้อมูลร้านค้าของตัวเอง
 *     tags: [Merchants]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: OK
 *       404:
 *         description: Merchant not found
 */
router.get("/merchants/me", checkAuth, isMerchant, getMerchantById);

router.patch("/merchants/update", checkAuth, isMerchant, updateMerchant);

export default router;