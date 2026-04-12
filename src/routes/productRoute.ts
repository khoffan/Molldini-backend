import { Router } from "express";
import { getAllProducts, addProduct, getProductById, getMerchantProducts, updateProductById, searchingProducts, addProductImportFIle } from "../controller/productController";
import { checkAuth, isMerchant } from "../common/middleware/authMiddleware";
import { upload } from "../common/middleware/upload_confing";
const router = Router();

/**
 * @openapi
 * /api/v1/products:
 *   get:
 *     summary: ดึงรายการสินค้าทั้งหมด
 *     tags: [Products]
 *     responses:
 *       200:
 *         description: OK
 */
router.get("/products", getAllProducts);

router.get("/products/search", searchingProducts);


/**
 * @openapi
 * /api/v1/products/{id}:
 *   get:
 *     summary: ดึงข้อมูลสินค้าตาม ID
 *     tags: [Products]
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
 *         description: Product not found
 */
router.get("/products/:id", getProductById);

/**
 * @openapi
 * /api/v1/products/merchant:
 *   get:
 *     summary: ดึงสินค้าของร้านค้าปัจจุบัน
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: OK
 *       403:
 *         description: Forbidden
 */
router.get("/products/merchant", checkAuth, isMerchant, getMerchantProducts);

/**
 * @openapi
 * /api/v1/products:
 *   post:
 *     summary: เพิ่มสินค้าใหม่ (เฉพาะ Merchant)
 *     tags: [Products]
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
 *               price:
 *                 type: number
 *               description:
 *                 type: string
 *     responses:
 *       201:
 *         description: Created
 *       403:
 *         description: Forbidden
 */
router.post("/products", checkAuth, isMerchant, addProduct);


router.post("/products/import-csv", checkAuth, isMerchant, upload.single("file"), addProductImportFIle)

/**
 * @openapi
 * /api/v1/products/{id}:
 *   put:
 *     summary: อัปเดตสินค้าตาม ID (เฉพาะ Merchant)
 *     tags: [Products]
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
 *               name:
 *                 type: string
 *               price:
 *                 type: number
 *               description:
 *                 type: string
 *     responses:
 *       200:
 *         description: OK
 *       403:
 *         description: Forbidden
 */
router.put("/products/:id", checkAuth, isMerchant, updateProductById);

export default router;
