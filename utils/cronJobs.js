import cron from "node-cron";
import Product from "../models/productmodel.js";
import Coupon from "../models/couponmodel.js";

cron.schedule("0 * * * *", async () => {
    const now = new Date();
    try {
        const expired = await Product.updateMany(
            {
                onSale: true,
                saleEndsAt: { $lt: now }
            },
            {
                $set: {
                    onSale: false,
                    salePrice: null,
                    discountPercent: null,
                    saleEndsAt: null
                }
            }
        );

        if (expired.modifiedCount > 0) {
            console.log(`Expired ${expired.modifiedCount} product sales at ${new Date().toLocaleString()}`);
        }
    } catch (error) {
        console.error("CRON error while clearing expired sales:", error.message);
    }
    
    try {
        const expiredCoupons = await Coupon.updateMany(
            {
                isActive: true,
                expiresAt: { $lt: now }
            },
            {
                $set: { isActive: false }
            }
        );
        if (expiredCoupons.modifiedCount > 0) {
            console.log(`🕒 ${new Date().toLocaleString()} - Deactivated ${expiredCoupons.modifiedCount} expired coupons`);
        }
    } catch (error) {
        console.error("❌ CRON error deactivating coupons:", error.message);
    }
});