import cron from "node-cron";
import Product from "../models/productmodel.js";
import Coupon from "../models/couponmodel.js";
import Order from "../models/ordermodel.js";
import { sendEmail } from "./sendEmail.js";
import { autoUpdateStatus } from "./autoUpdateStatus.js";

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
            console.log(`Expired ${expired.modifiedCount} product sales at ${now.toLocaleString()}`);
            await sendEmail(process.env.ADMIN_EMAIL, "🔔 Product Sales Expired", `${expired.modifiedCount} product sales expired.`);
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
            await sendEmail(process.env.ADMIN_EMAIL, "🔔 Coupons Deactivated", `${expiredCoupons.modifiedCount} coupons expired.`);
        }
    } catch (error) {
        console.error("❌ CRON error deactivating coupons:", error.message);
    }

    try {
        const ordersToUpdate = await Order.find({
            status: { $in: ["Processing", "Paid"] },
            "shippingAddress.pincode": { $exists: true }
        }).select("orderId");

        for (const order of ordersToUpdate) {
            autoUpdateStatus(order.orderId);
        }
        if (ordersToUpdate.length > 0) {
            console.log(`🚚 Triggered auto status updates for ${ordersToUpdate.length} orders`);
        }
    } catch (error) {
        console.error("Error auto-updating order statuses:", error.message);
    }
});