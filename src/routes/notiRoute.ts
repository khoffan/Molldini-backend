import { Router } from "express";
import { fetchNotification } from "../controller/notificationController";
import { checkAuth } from "../middleware/authMiddleware";


const router = Router();

router.get("/notifications", checkAuth, fetchNotification);

export default router;