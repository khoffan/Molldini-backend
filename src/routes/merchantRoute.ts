import { Router } from "express";
import { addMerchant, getAllMerchants, getMerchantById } from "../controller/merchantController";
import { checkAuth, isMerchant } from "../middleware/authMiddleware";
const router = Router();

router.post("/merchants", checkAuth, isMerchant, addMerchant);
router.get("/merchants", checkAuth, isMerchant, getAllMerchants);
router.get("/merchants/:id", checkAuth, isMerchant, getMerchantById);

export default router;