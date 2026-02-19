import { Router } from "express";
import { syncUser, getAllUsers, getUserById, updateUser, deleteUser, updateAddressUser, updateFCMToken, signOutUser } from "../controller/userController";
import { checkAuth } from "../middleware/authMiddleware";

const router = Router();

/**
 * @openapi
 * /api/v1/users/me:
 *   post:
 *     summary: Sync ข้อมูลผู้ใช้จาก Firebase
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Sync สำเร็จ
 */
router.post("/users/me", syncUser);

/**
 * @openapi
 * /api/v1/users:
 *   get:
 *     summary: ดึงข้อมูลผู้ใช้ทั้งหมด
 *     tags: [Users]
 *     responses:
 *       200:
 *         description: OK
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/User'
 */
router.get("/users", getAllUsers);

/**
 * @openapi
 * /api/v1/users/logout:
 *   post:
 *     summary: ออกจากระบบ
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: ออกจากระบบสำเร็จ
 */
router.post("/users/logout", checkAuth, signOutUser)

/**
 * @openapi
 * /api/v1/profile:
 *   get:
 *     summary: ดูข้อมูลโปรไฟล์ตัวเอง
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: OK
 */
router.get("/profile", checkAuth, getUserById);

/**
 * @openapi
 * /api/v1/users/{id}:
 *   put:
 *     summary: อัปเดตข้อมูลผู้ใช้
 *     tags: [Users]
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
 *               phoneNumber:
 *                 type: string
 *     responses:
 *       200:
 *         description: Updated
 *
 *   delete:
 *     summary: ลบผู้ใช้
 *     tags: [Users]
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
 *         description: Deleted
 */
router.put("/users/:id", checkAuth, updateUser);
router.put("/update-fcm-token", checkAuth, updateFCMToken);
router.put("/users/address/me", checkAuth, updateAddressUser);
router.delete("/users/:id", checkAuth, deleteUser);

export default router;