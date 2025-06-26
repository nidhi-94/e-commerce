import express from "express";
import { getUserProfile, updateUserProfile, getUserOrders, changeUserPassword, sendOtpToEmail, verifyOtpAndUpdateEmail, setNewPasswordAfterOtp  } from "../controllers/user/userController.js";
import { requireAuth, requireUser, verifyToken } from "../middleware/authmiddleware.js";
import { uploadOptionalIcon } from "../middleware/uploadmiddleware.js";

const router = express.Router();

router.get("/profile", requireAuth, requireUser, getUserProfile);
router.put("/update-profile", requireAuth, requireUser, uploadOptionalIcon, updateUserProfile)
router.get("/dashboard", requireAuth, requireUser, getUserOrders);
router.put("/change-password", requireAuth, requireUser, changeUserPassword);
router.post("/request-email-update", requireAuth, requireUser, sendOtpToEmail);
router.post("/verify-email-otp", requireAuth, requireUser,verifyToken, verifyOtpAndUpdateEmail);
router.post("/auth/set-new-password", verifyToken , setNewPasswordAfterOtp);

export default router;