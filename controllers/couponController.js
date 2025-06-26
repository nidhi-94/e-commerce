import Coupon from "../models/couponmodel.js";
import Cart from "../models/cartmodel.js";
import { calculateOrderSummary } from "../utils/calculateOrderSummary.js";
import applyCoupon from "../utils/applyCoupon.js";
import { recordCouponUsage } from "../utils/recordCouponUsage.js";

export const applyCouponToCart = async (req, res) => {
    const userId = req.user._id;
    const { code } = req.body;

    console.log("🔁 Apply coupon API called");
    console.log("🧑‍💻 User ID:", userId);
    console.log("🎟️ Coupon code received:", code);

    try {
        const cart = await Cart.findOne({ user: userId }).populate("items.product");
        if (!cart || !cart.items.length) {
            console.log("🚫 No cart or empty cart found");
            return res.status(400).json({ message: "Your cart is empty." });
        }
        const orderItems = cart.items.map(item => ({
            product: item.product._id,
            quantity: item.quantity
        }));

        const productCategories = cart.items.map(item => item.product.category);

        const subTotal = cart.items.reduce((acc, item) => {
            const price = item.product.onSale ? item.product.salePrice : item.product.price;
            return acc + price * item.quantity;
        }, 0);

        console.log("📦 Cart items:", orderItems);
        console.log("📦 Product categories:", productCategories);
        console.log("💰 Subtotal:", subTotal);

        let coupon;
        try {
            coupon = await applyCoupon(code, userId, subTotal, productCategories);
        } catch (err) {
            return res.status(400).json({ message: err.message });
        }

        await recordCouponUsage(userId, coupon);

        cart.coupon = coupon._id;
        await cart.save();

        const summary = await calculateOrderSummary(orderItems, code, userId);
        console.log("✅ Coupon applied successfully:", summary.appliedCoupon);
        res.json({
            message: `Coupon '${code}' applied successfully.`,
            discount: summary.discount,
            finalTotal: summary.finalTotal,
            appliedCoupon: summary.appliedCoupon
        });
    } catch (error) {
        console.error("❌ Error applying coupon:", error.message);
        res.status(500).json({ message: "Server error" });
    }
}

export const getApplicableCoupons = async (req, res) => {
    try {
        const userId = req.user._id;

        const cart = await Cart.findOne({ user: userId }).populate("items.product");
        if (!cart || cart.items.length === 0) {
            return res.status(400).json({ message: "Cart is empty" });
        }

        const cartTotal = cart.items.reduce((acc, item) => {
            const price = item.product.onSale ? item.product.salePrice : item.product.price;
            return acc + price * item.quantity;
        }, 0);

        const productCategories = cart.items.map(item => item.product.category);

        const now = new Date();
        const allCoupons = await Coupon.find({
            isActive: true,
            startsAt: { $lte: now },
            expiresAt: { $gte: now }
        });

        const applicable = allCoupons.filter(coupon => {
            if (coupon.minOrderValue && cartTotal < coupon.minOrderValue) return false;
            if (coupon.maxUsage && coupon.usedCount >= coupon.maxUsage) return false;

            if (coupon.productCategory?.length && !coupon.productCategory.includes("ALL")) {
                const match = productCategories.some(cat => coupon.productCategory.includes(cat));
                if (!match) return false;
            }

            return true;
        });
        const formatted = applicable.map(coupon => ({
            code: coupon.code,
            type: coupon.type,
            discountPercent: coupon.discountPercent,
            discountAmount: coupon.discountAmount,
            minOrderValue: coupon.minOrderValue,
            productCategory: coupon.productCategory,
            onlyForFirstOrder: coupon.onlyForFirstOrder,
            expiresAt: coupon.expiresAt,
            description: `Get ${coupon.discountPercent || `₹${coupon.discountAmount}`} off${coupon.productCategory?.length && !coupon.productCategory.includes("ALL") ? ` on ${coupon.productCategory.join(", ")}` : ""}${coupon.minOrderValue ? ` | Min order ₹${coupon.minOrderValue}` : ""}`
        }));

        res.json({ applicableCoupons: formatted });
    } catch (error) {
        console.error("🔴 Error fetching applicable coupons:", error.message);
        res.status(500).json({ message: "Failed to fetch applicable coupons." });
    }
}
export const getCouponUser = async (req, res) => {
    try {
        const coupon = await Coupon.findOne({ code: req.params.code });
        if (!coupon) return res.status(404).json({ message: "Coupon not found" });
        res.json(coupon);
    } catch (error) {
        res.status(500).json({ message: "Failed to get coupon. " });
    }
};