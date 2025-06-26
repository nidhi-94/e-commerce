import express from "express";
import { requireAdmin, requireAuth, requireUser } from "../middleware/authmiddleware.js";
import { createCoupon, deleteCoupon, filterCoupons, getCoupons, toggleCouponStatus } from "../controllers/admin/couponAdminController.js";
import { applyCouponToCart, getApplicableCoupons, getCouponUser } from "../controllers/couponController.js";

const router = express.Router();

router.post("/create", requireAuth, requireAdmin, createCoupon);
router.get("/list", requireAuth, requireAdmin, getCoupons);
router.get("/filter", requireAuth, requireAdmin, filterCoupons);
router.delete("/delete/:id", requireAuth, requireAdmin, deleteCoupon);
router.patch("/:id/toggle", requireAuth, requireAdmin, toggleCouponStatus);

router.get("/:code", requireAuth, requireUser, getCouponUser);
router.get("/applicable", requireAuth, requireUser, getApplicableCoupons);
router.post("/apply", requireAuth, requireUser, applyCouponToCart);

export default router;  