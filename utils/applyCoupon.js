import Coupon from "../models/couponmodel.js";
import User from "../models/usermodel.js";

/**
 * Validates and applies coupon logic
 * @param {String} code - Coupon code to apply
 * @param {ObjectId} userId - Current user's ID
 * @param {Number} cartTotal - Total cart value
 * @param {Array<String>} productCategories - Array of categories in cart
 * @returns {Object} - Valid coupon object
 */

const applyCoupon = async (code, userId, cartTotal, productCategories = []) => {
    const now = new Date();

    console.log("🔍 Applying coupon:", code);
    console.log("🕒 Current date:", now);
    console.log("🛒 Cart total:", cartTotal);
    console.log("🏷️ Product categories in cart:", productCategories);
    console.log("👤 User ID:", userId);

    const coupon = await Coupon.findOne({
        code,
        isActive: true,
        startsAt: { $lte: now },
        expiresAt: { $gte: now },
    });
    console.log("🎟️ Coupon found:", coupon);
    if (!coupon) throw new Error("Invalid or expired token.");
    if (coupon.maxUsage && coupon.usedCount >= coupon.maxUsage) {
        throw new Error("Coupon usage limit exceeded");
    }
    if (coupon.onlyForFirstOrder) {
        const user = await User.findById(userId).populate("purchases");
        console.log("🧾 User purchases:", user?.purchases?.length || 0);
        if (user && user.purchases.length > 0) {
            throw new Error("Coupon is only valid for first-time orders.");
        }
    }
    const userUsage = coupon.usageByUser.find((u) => u.user.toString() === userId.toString());
    if (userUsage) {
        console.log("👤 Coupon already used by this user:", userUsage);
    }
    if (userUsage && userUsage.count >= 1) {
        throw new Error("You’ve already used this coupon.");
    }
    if (coupon.minOrderValue && cartTotal < coupon.minOrderValue) {
        console.log(`📉 Cart value ₹${cartTotal} is less than min required ₹${coupon.minOrderValue}`);
        throw new Error(`Minimum order value should be ₹${coupon.minOrderValue}`);
    }
    if (coupon.productCategory?.length > 0 && !coupon.productCategory.includes("ALL")) {
        const isCategoryMatch = productCategories.some(cat =>
            coupon.productCategory.includes(cat)
        );
        if (!isCategoryMatch) {
            throw new Error("This coupon is not applicable for selected categories.");
        }
    }

    return coupon;
};

export default applyCoupon;