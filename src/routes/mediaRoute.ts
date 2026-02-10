import { Router } from "express";
import { setMedia, getAllMedia } from '../controller/mediaController';

const router = Router();
/**
 * @openapi
 * /api/v1/medias:
 *   post:
 *     summary: อัปโหลดไฟล์สื่อใหม่
 *     tags: [Medias]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *     responses:
 *       201:
 *         description: Media uploaded
 *       400:
 *         description: Bad request
 *       401:
 *         description: Unauthorized
 */
router.post("/medias", setMedia);

/**
 * @openapi
 * /api/v1/medias:
 *   get:
 *     summary: ดึงรายการไฟล์สื่อทั้งหมด
 *     tags: [Medias]
 *     responses:
 *       200:
 *         description: OK
 */
router.get("/medias", getAllMedia);

export default router;