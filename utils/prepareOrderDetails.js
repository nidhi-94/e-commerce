import Product from "../models/productmodel.js";
import { buildStripeLineItems } from "./stripeLineItems.js";
import { calculateOrderSummary } from "./calculateOrderSummary.js";

export const prepareOrderDetails = async ({
  userId,
  orderItems,
  couponCode
}) => {
  const productIds = orderItems.map(item => item.product);
  const products = await Product.find({ _id: { $in: productIds } });

  const productMap = new Map();
  products.forEach(p => productMap.set(p._id.toString(), p));

  const enrichedItems = [];
  const formattedItems = [];

  for (const item of orderItems) {
    const product = productMap.get(item.product.toString());
    if (!product) throw new Error(`${item.product} not found`);
    if (product.stock < item.quantity) throw new Error(`Insufficient stock for ${product.title}`);

    enrichedItems.push({
      title: product.title,
      price: product.onSale ? product.salePrice : product.price,
      quantity: item.quantity
    });
    formattedItems.push({
      product: product._id,
      price: product.onSale ? product.salePrice : product.price,
      quantity: item.quantity
    });

    await Product.updateOne({ _id: product._id }, { $inc: { stock: -item.quantity } });
  }

  const { 
    subTotal,
    taxAmount,
    shippingCharges,
    grandTotal,
    discount,
    finalTotal,
    appliedCoupon 
     } = await calculateOrderSummary(orderItems, couponCode, userId);

  const stripeLineItems = buildStripeLineItems(
    enrichedItems,
    shippingCharges,
    taxAmount,
    "Shipping Charges",
    "Tax Amount",
    discount
  );
  console.log("🧾 Stripe line items:", stripeLineItems);

  return {
    stripeLineItems,
    formattedItems,
    enrichedItems,
    discount,
    appliedCoupon,
    subTotal,
    finalGrandTotal: finalTotal,
    taxAmount,
    shippingCharges
  };
};