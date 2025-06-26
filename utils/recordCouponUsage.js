import Coupon from "../models/couponmodel.js";

export const recordCouponUsage = async (userId, coupon) => {
    const updatedCoupon = await Coupon.findOne({ code: coupon.code });

    if (!updatedCoupon) {
        console.warn(`⚠️ Coupon '${coupon.code}' not found during usage update.`);
        return;
    }
    updatedCoupon.usedCount = (updatedCoupon.usedCount || 0) + 1;

    if (!Array.isArray(updatedCoupon.usageByUser)) {
        updatedCoupon.usageByUser = [];
    }

    const existingUsage = updatedCoupon.usageByUser.find(
        u => u.user.toString() === userId.toString()
    );

    if (existingUsage) {
        existingUsage.count += 1;
    } else {
        updatedCoupon.usageByUser.push({ user: userId, count: 1 });
    }

    await updatedCoupon.save();
}