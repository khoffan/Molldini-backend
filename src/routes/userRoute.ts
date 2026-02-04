import { Router } from "express";
import { syncUser, getAllUsers, getUserById, updateUser, deleteUser } from "../controller/userController";
import { checkAuth } from "../middleware/authMiddleware";

const router = Router();

router.post("/users/me", syncUser);
router.get("/users", getAllUsers);
router.get("/profile", checkAuth, getUserById);
router.put("/users/:id", checkAuth, updateUser);
router.delete("/users/:id", checkAuth, deleteUser);

export default router;