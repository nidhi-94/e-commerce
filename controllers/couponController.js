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
        console.log("🛒 Cart found:", cart ? "✅ Yes" : "❌ No");

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
            console.error("❌ Coupon validation failed:", err.message);
            return res.status(400).json({ message: err.message });
        }
        console.log("✅ Coupon validated:", coupon.code);
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
};

export const getApplicableCoupons = async (req, res) => {
    try {
        const userId = req.user._id;
        console.log("🔽 [getApplicableCoupons] Called by user:", userId);

        const cart = await Cart.findOne({ user: userId }).populate("items.product");
        console.log("🛒 Cart fetched:", cart ? JSON.stringify(cart.items, null, 2) : "Not found");
        if (!cart || cart.items.length === 0) {
            console.log("⚠️ Cart is empty. Returning error.");
            return res.status(400).json({ message: "Cart is empty" });
        }

        const cartTotal = cart.items.reduce((acc, item) => {
            const price = item.product.onSale ? item.product.salePrice : item.product.price;
            return acc + price * item.quantity;
        }, 0);
        console.log("💰 Cart total:", cartTotal);

        const productCategories = cart.items.map(item => item.product.category);
        console.log("📦 Product categories in cart:", productCategories);

        const now = new Date();
        const allCoupons = await Coupon.find({
            isActive: true,
            startsAt: { $lte: now },
            expiresAt: { $gte: now }
        });
        console.log("🎟️ All active coupons in DB:", allCoupons.map(c => c.code));

        const applicable = allCoupons.filter(coupon => {
            if (coupon.minOrderValue && cartTotal < coupon.minOrderValue) {
                console.log(`❌ ${coupon.code}: cartTotal ${cartTotal} < minOrderValue ${coupon.minOrderValue}`);
                return false;
            }
            if (coupon.maxUsage && coupon.usedCount >= coupon.maxUsage) {
                console.log(`❌ ${coupon.code}: usedCount ${coupon.usedCount} >= maxUsage ${coupon.maxUsage}`);
                return false;
            }

            if (coupon.productCategory?.length && !coupon.productCategory.includes("ALL")) {
                const matches = productCategories.some(cat => coupon.productCategory.includes(cat));
                console.log(`🔎 ${coupon.code}: category filter ${coupon.productCategory}. Match?`, matches);
                return matches;
            }
            console.log(`✅ ${coupon.code} passed all filters`);
            return true;
        });
        console.log("✅ Applicable coupons:", applicable.map(c => c.code));
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
};

export const getCouponUser = async (req, res) => {
    try {
        const coupon = await Coupon.findOne({ code: req.params.code });
        if (!coupon) return res.status(404).json({ message: "Coupon not found" });
        res.json(coupon);
    } catch (error) {
        res.status(500).json({ message: "Failed to get coupon. " });
    }
};