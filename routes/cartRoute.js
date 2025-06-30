import express from "express";
import { getCart, addToCart, updateCartItem, removeCartItem, applyCoupon, clearCart } from "../controllers/user/cartController.js";
import { requireAuth, requireUser, verifyToken } from "../middleware/authmiddleware.js";

const router = express.Router();
router.use(verifyToken);

router.get("/", requireAuth, requireUser, getCart);

router.post("/add" , requireAuth, requireUser, addToCart);

router.put("/update", updateCartItem);

router.delete("/remove/:productId", requireAuth, removeCartItem);

router.delete("/clear", requireAuth, requireUser, clearCart);

router.post("/apply-coupon", applyCoupon);

export default router;