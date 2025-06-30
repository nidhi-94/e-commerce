import Product from "../models/productmodel.js";
import applyCoupon from "./applyCoupon.js";
import { calculateTaxAndShipping } from "./calculatetax&shipping.js";

export const calculateOrderSummary = async (orderItems, couponCode = "none", userId = null) => {
    let subTotal = 0;
    const productIds = orderItems.map(item => item.productId || item.product);
    const products = await Product.find({ _id: { $in: productIds } });

    const productMap = new Map();
    const productCategoriesInOrder = [];

    products.forEach(p => {
        productMap.set(p._id.toString(), p);
        if (p.category) productCategoriesInOrder.push(p.category);
    });

    for (const item of orderItems) {
        const productId = item.productId || item.product;
        const product = productMap.get(productId.toString());
        if (!product) throw new Error(`Product not found: ${productId}`);
        const priceToUse = product.onSale ? product.salePrice : product.price;
        subTotal += priceToUse * item.quantity;
    }

    const { taxAmount, shippingCharges } = calculateTaxAndShipping(subTotal);
    const grandTotal = parseFloat((subTotal + taxAmount + shippingCharges).toFixed(2));

    let discount = 0;
    let appliedCoupon = null;

    if (couponCode && couponCode !== "none") {
        console.log("🔢 Passing to applyCoupon:", {
            code: couponCode,
            userId,
            cartTotal: grandTotal,
            categories: productCategoriesInOrder
        });
        const coupon = await applyCoupon(couponCode, userId, grandTotal, productCategoriesInOrder);

        discount = coupon.discountPercent ? (grandTotal * coupon.discountPercent) / 100 : coupon.discountAmount;
        appliedCoupon = {
            _id: coupon._id,
            code: coupon.code,
            discountValue: discount.toFixed(2),
            type: coupon.type,
        };
    }
    const finalTotal = parseFloat((grandTotal - discount).toFixed(2));

    return {
        subTotal: parseFloat(subTotal.toFixed(2)),
        shippingCharges,
        taxAmount,
        grandTotal,
        discount: parseFloat(discount.toFixed(2)),
        finalTotal,
        appliedCoupon,
        couponMessage: appliedCoupon
            ? `Coupon ${appliedCoupon.code} applied successfully.`
            : null
    };
};