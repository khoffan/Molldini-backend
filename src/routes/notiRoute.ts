import { Router } from "express";
import { fetchNotification, readNotification } from "../controller/notificationController";
import { checkAuth } from "../common/middleware/authMiddleware";


const router = Router();

router.get("/notifications", checkAuth, fetchNotification);
router.patch("/notifications/:id/read", checkAuth, readNotification);

export default router;