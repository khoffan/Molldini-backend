import { Router } from "express";
import { setAddress, getAllAddress, getAddresById } from '../controller/addressController'

const router = Router();

router.get("/addresses", getAllAddress);
router.get("/addresses/id", getAddresById);
router.post("/addresses", setAddress);

export default router;