import { Router } from "express";
import { addMerchant, getAllMerchants, getMerchantById } from "../controller/merchantController";

const router = Router();

router.post("/merchants", addMerchant);
router.get("/merchants", getAllMerchants);
router.get("/merchants/:id", getMerchantById);

export default router;