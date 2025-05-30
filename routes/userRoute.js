import express from "express";
import { getUserProfile, updateUserProfile, getUserOrders } from "../controllers/userController.js";
import { requireAuth, requireUser } from "../middleware/authmiddleware.js";

const router = express.Router();

router.get("/profile", requireAuth, requireUser, getUserProfile);
router.put("/profile", requireAuth, requireUser, updateUserProfile)
router.get("/dashboard", requireAuth, requireUser, getUserOrders);

export default router;