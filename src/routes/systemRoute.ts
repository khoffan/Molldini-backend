import { Router } from "express";
import { settingRevanueFeePercentage, revenueLogs, getSettingRevanue, updateRevenueFeePercentage } from "../controller/systemController";
import { checkAuth, isAdmin } from "../middleware/authMiddleware";

const router = Router()

router.post("/system/setting/revenue", checkAuth, isAdmin, settingRevanueFeePercentage)
router.get("/system/setting/revenue", checkAuth, isAdmin, getSettingRevanue)
router.patch("/system/setting/revenue/:id", checkAuth, isAdmin, updateRevenueFeePercentage)
router.get("/system/revenue/log", checkAuth, isAdmin, revenueLogs)

export default router