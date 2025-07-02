import mongoose from "mongoose";
import Stripe from "stripe";
import Order from "../../models/ordermodel.js";
import User from "../../models/usermodel.js";
import { calculateOrderSummary } from "../../utils/calculateOrderSummary.js";
import { sendEmail } from "../../utils/sendEmail.js";
import Cart from "../../models/cartmodel.js";
import { prepareOrderDetails } from "../../utils/prepareOrderDetails.js";
import { autoUpdateStatus } from "../../utils/autoUpdateStatus.js";
import { recordCouponUsage } from "../../utils/recordCouponUsage.js";
import fs from "fs";
import path from "path";
import { generateInvoicePDF } from "../../utils/generateInvoice.js";
import OrderOtp from "../../models/otpmodel.js";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export const calculateOrderTotal = async (req, res) => {
  try {
    console.log("🔍 req.headers:", req.headers);
    console.log("🧪 Received body keys:", Object.keys(req.body || {}));
    console.log("🧪 orderItems:", req.body?.orderItems);
    const userId = req.user?._id || null;
    const { orderItems = [], couponCode = "none" } = req.body || {};

    if (!orderItems?.length) {
      return res.status(400).json({ error: "Order items required." })
    }

    const result = await calculateOrderSummary(orderItems, couponCode, userId);
    return res.json(result);
  } catch (error) {
    console.error("Error calculating total:", error.message);
    res.status(500).json({ message: "Failed to calculate total order." });
  }
}

export const checkoutFromCart = async (req, res) => {
  try {
    const userId = req.user._id;
    console.log("✅ Checkout initiated by user:", userId);
    let {
      orderItems = [],
      shippingAddress = null,
      paymentMethod = null,
      couponCode = "none"
    } = req.body || {};
    console.log("📦 Request body:", { orderItems, shippingAddress, paymentMethod, couponCode });

    if (!shippingAddress || !paymentMethod) {
      console.warn("⚠️ Missing shippingAddress or paymentMethod");
      return res.status(400).json({ message: "Missing address or payment method." });
    }
    const cart = await Cart.findOne({ user: userId }).populate("items.product").populate("coupon");
    if (!cart || !cart.items.length) {
      console.warn("⚠️ Cart empty or not found");
      return res.status(400).json({ message: "Cart is empty." });
    }

    orderItems = cart.items.map(item => ({
      product: item.product._id,
      price: item.product.salePrice ?? item.product.price,
      quantity: item.quantity,
    }));

    couponCode = cart.coupon?.code ?? "none";

    console.log("🧾 Final orderItems:", orderItems);
    console.log("🏷️ Applied coupon:", couponCode);

    const {
      stripeLineItems,
      formattedItems,
      discount,
      appliedCoupon,
      subTotal,
      finalGrandTotal,
      taxAmount,
      shippingCharges
    } = await prepareOrderDetails({
      userId,
      orderItems,
      couponCode
    });

    console.log("📦 Order summary:", {
      subTotal,
      taxAmount,
      shippingCharges,
      discount,
      finalGrandTotal,
      appliedCoupon
    });

    const expectedDate = new Date();
    expectedDate.setDate(expectedDate.getDate() + 7);

    const newOrder = new Order({
      user: userId,
      items: formattedItems,
      totalAmount: subTotal,
      shippingCharges,
      taxAmount,
      grandTotal: finalGrandTotal,
      discountAmount: discount,
      status: "Processing",
      paymentInfo: {
        method: paymentMethod,
        paymentStatus: "Pending",
      },
      shippingAddress,
      expectedDeliveryDate: expectedDate,
      trackingHistory: [{
        status: "Processing",
        location: "Warehouse",
        dateTime: new Date(),
        note: "Order received and is being processed"
      }],
      couponCode: appliedCoupon ? appliedCoupon.code : undefined
    });

    const generatedOrderId = `ORD-${newOrder._id.toString().slice(-6).toUpperCase()}`;
    newOrder.orderId = generatedOrderId;
    console.log("🛍️ Creating Stripe checkout session...");
    console.log("🧾 Stripe line items:", stripeLineItems);

    let stripeDiscount = null;
    if (discount > 0) {
      stripeDiscount = await stripe.coupons.create({
        amount_off: Math.round(discount * 100),
        currency: "inr",
        duration: "once"
      });
    }

    const stripeSession = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: stripeLineItems,
      mode: "payment",
      metadata: {
        userId: userId.toString(),
        generatedOrderId
      },
      success_url: `${process.env.FRONTEND_URL}/success`,
      cancel_url: `${process.env.CANCEL_URL}/cancel`,
      ...(stripeDiscount ? { discounts: [{ coupon: stripeDiscount.id }] } : {}),
      ...(shippingCharges > 0 ? {
        shipping_options: [
          {
            shipping_rate_data: {
              type: "fixed_amount",
              fixed_amount: { amount: Math.round(shippingCharges * 100), currency: "inr" },
              display_name: "Standard Shipping",
              delivery_estimate: {
                minimum: { unit: "business_day", value: 5 },
                maximum: { unit: "business_day", value: 7 }
              }
            }
          }
        ]
      } : {})
    });
    newOrder.paymentInfo.sessionId = stripeSession.id;

    if (appliedCoupon) {
      console.log("📌 Recording coupon usage...");
      await recordCouponUsage(userId, appliedCoupon);
    }

    await newOrder.save();
    console.log("💾 Order saved with ID:", generatedOrderId);

    const user = await User.findById(userId);
    if (user) {
      const invoicePath = await generateInvoicePDF(newOrder);
      await sendEmail(
        user.email,
        "🧾 Invoice for Your Order " + generatedOrderId,
        `Hi ${user.name || "Customer"},\n\nThank you for your purchase. Please find attached the invoice for your order ${generatedOrderId}.\n\n- NK Team`,
        invoicePath
      );
    }

    await sendEmail(
      user.email,
      "🎉 Order Placed Successfully",
      `Hi ${user.name || "User"},<br/><br/>Your order <b>${generatedOrderId}</b> has been placed successfully.
        <br/>We will notify you once it is shipped.<br/><br/><b>Thank you for shopping with us!</b><br/>- NK Team`,
    );

    await Cart.findOneAndUpdate({ user: userId }, { items: [], coupon: null });
    console.log("🧹 Cart cleared after order");

    await Wishlist.findOneAndUpdate(
      { user: userId },
      { $pull: { items: { product: { $in: orderItems.map(i => i.product) } } } }
    );

    autoUpdateStatus(generatedOrderId);
    console.log("🚀 Order status auto-update triggered for:", generatedOrderId);


    res.json({ url: stripeSession.url, orderId: generatedOrderId, discount });

  } catch (err) {
    console.error("Stripe order creation error:", err);
    res.status(500).json({ error: "Something went wrong while creating the order" });
  }
};

export const getMyOrders = async (req, res) => {
  try {
    const userId = req.user._id;
    console.log("📦 Fetching orders for user:", userId);

    const orders = await Order.find({ user: userId })
      .populate("items.product", "title image")
      .sort({ createdAt: -1 });
    console.log("✅ Orders fetched:", orders.length);

    res.json(orders);
  } catch (error) {
    console.error("Get my orders error:", error);
    res.status(500).json({ error: "Failed to fetch your orders" });
  }
}

export const reOrder = async (req, res) => {
  try {
    const userId = req.user._id;
    const { orderId } = req.params;

    const orderDoc = await Order.findOne({ orderId, user: userId });
    if (!orderDoc) return res.status(404).json({ error: "Order not found." });

    const cart = await Cart.findOneAndUpdate(
      { user: userId },
      {
        $set: { coupon: null },
        $push: {
          items: {
            $each: orderDoc.items.map(item => ({
              product: item.product._id,
              quantity: item.quantity
            }))
          }
        }
      },
      { upsert: true, new: true }
    );

    res.json({ message: "Items added to cart for reorder.", cart });
  } catch (error) {
    console.error("❌ Reorder error:", error);
    res.status(500).json({ error: "Failed to reorder items" });
  }
};

export const trackOrderStatus = async (req, res) => {
  try {
    const { orderId } = req.params;
    const userId = req.user._id;

    const order = await Order.findOne({ orderId, user: userId })
      .select("orderId status expectedDeliveryDate trackingHistory createdAt")
      .lean();

    if (!order) return res.status(404).json({ message: "Order not found" });

    res.json({
      orderId: order.orderId,
      status: order.status,
      placedOn: new Date(order.createdAt).toLocaleDateString("en-IN"),
      expectedDelivery: order.expectedDeliveryDate
        ? new Date(order.expectedDeliveryDate).toLocaleDateString("en-IN")
        : "N/A",
      trackingHistory: (order.trackingHistory || []).sort((a, b) => new Date(b.dateTime) - new Date(a.dateTime)),
    });
  } catch (error) {
    console.error("Track order error:", error);
    res.status(500).json({ message: "Failed to track order." });
  }
};

export const userPreviewInvoice = async (req, res) => {
  try {
    const userId = req.user._id;
    const { orderId } = req.params;
    console.log("👤 User invoice preview requested for:", orderId, "by user:", userId);

    if (!mongoose.Types.ObjectId.isValid(orderId)) {
      return res.status(400).json({ message: "Invalid orderId." });
    }

    const order = await Order.findOne({ _id: orderId, user: userId })
      .populate("user")
      .populate("items.product");
    if (!order) {
      console.log("Order not fount or not owned by user.");
      return res.status(404).json({ message: "Order not found or not accessible." });
    }

    const invoiceDir = path.resolve("./invoices");
    const invoicePath = path.join(invoiceDir, `${order._id}.pdf`);

    if (!fs.existsSync(invoiceDir)) {
      fs.mkdirSync(invoiceDir)
    }
    await generateInvoicePDF(order, invoicePath);
    console.log("✅ Invoice generated at:", invoicePath);

    res.sendFile(invoicePath);
  } catch (error) {
    console.error("❌ User invoice preview error:", error);
    res.status(500).json({ message: "Failed to preview invoice." });
  }
};

export const sendCancelOtp = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    const order = await Order.findOne({ _id: id, user: userId }).populate("user");
    if (!order) return res.status(404).json({ message: "Order not found." });
    if (order.status === "Cancelled") {
      return res.status(400).json({ message: "Order already cancelled." });
    }

    const existingOtp = await OrderOtp.findOne({ orderId: id, userId });
    if (existingOtp && existingOtp.expiresAt > new Date()) {
      const remaining = Math.ceil((existingOtp.expiresAt - Date.now()) / 1000);
      return res.status(429).json({ message: `OTP already sent. Please wait ${remaining}s to resend.` });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

    await OrderOtp.findOneAndUpdate(
      { orderId: id, userId },
      { otp, expiresAt, attempts: 0 },
      { upsert: true, new: true }
    );

    await sendEmail(
      order.user.email,
      `⚠️ OTP to Cancel Order ${order.orderId}`,
      `Hi ${order.user.name || "Customer"},\n\nYour OTP to cancel order <b>${order.orderId}</b> is: <b>${otp}</b>.\nIt will expire in 5 minutes.\n\nIf this wasn’t you, please ignore this email.\n\nThanks, NK Team`
    );

    res.json({ message: "OTP sent to your email." });
  } catch (error) {
    console.error("Error sending cancel otp:", error);
    res.status(500).json({ message: "Failed to send otp. " });
  }
};

export const cancelOrderWithOtp = async (req, res) => {
  try {
    const { id } = req.params;
    const { otp } = req.body;
    const userId = req.user._id;

    const order = await Order.findOne({ _id: id, user: userId }).populate("user");
    if (!order) return res.status(404).json({ message: "Order not found." });
    if (order.status === "Cancelled") {
      return res.status(400).json({ message: "Order already cancelled." });
    }

    const otpEntry = await OrderOtp.findOne({ orderId: id, userId });
    if (!otpEntry || otpEntry.expiresAt < Date.now()) {
      await OrderOtp.deleteOne({ orderId: id, userId });
      return res.status(400).json({ message: "OTP expired or not found." });
    }
    if (otpEntry.attempts >= 3) {
      await OrderOtp.deleteOne({ orderId: id, userId });
      return res.status(400).json({ message: "Too many incorrect attempts. Please request a new OTP." });
    }

    if (otpEntry.otp !== otp) {
      otpEntry.attempts += 1;
      await otpEntry.save();
      return res.status(400).json({ message: `Invalid OTP. ${3 - otpEntry.attempts} attempt(s) left.` });
    }

    await updateOrderStatusHelper(order, "Cancelled", "System", "Cancelled via OTP verification.");
    await OrderOtp.deleteOne({ orderId: id, userId });
    res.json({ message: "Order cancelled successfully." });
  } catch (error) {
    console.error("Error canceling with otp:", error);
    res.status(500).json({ message: "Failed to cancel order." })
  }
};