import express from "express";
import { forgotPassword, getHomePageData, login, logout, refreshToken, register, resetPassword } from "../controllers/authController.js";

const router = express.Router();

router.post("/register", register);
router.post("/login", login);
router.post("/forgotPassword", forgotPassword);
router.post("/reset-password/:token", resetPassword);
router.post("/refresh-token", refreshToken);
router.post("/logout", logout);
router.get("/homepage", getHomePageData)

export default router;