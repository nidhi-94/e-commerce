import Stripe from "stripe";
import Order from "../../models/ordermodel.js";
import Coupon from "../../models/countermodel.js";
import User from "../../models/usermodel.js";
import { calculateOrderSummary } from "../../utils/calculateOrderSummary.js";
import { sendEmail } from "../../utils/sendEmail.js";
import Cart from "../../models/cartmodel.js";
import { prepareOrderDetails } from "../../utils/prepareOrderDetails.js";
import { autoUpdateStatus } from "../../utils/autoUpdateStatus.js";
import { recordCouponUsage } from "../../utils/recordCouponUsage.js";

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
      await sendEmail(
        user.email,
        "🎉 Order Placed Successfully",
        `Hi ${user.name || "User"},<br/><br/>Your order <b>${generatedOrderId}</b> has been placed successfully.
        <br/>We will notify you once it is shipped.<br/><br/><b>Thank you for shopping with us!</b><br/>- NK Team`
      );
    }
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

export const cancelOrder = async (req, res) => {
  try {
    const userId = req.user._id;
    const { orderId } = req.params;

    const order = await Order.findOne({ orderId, user: userId }).populate("user");

    if (!order) return res.status(404).json({ message: "Order not found" });

    if (["Shipped", "Delivered", "Cancelled"].includes(order.status)) {
      return res.status(400).json({ message: `Cannot cancel order in '${order.status}' status.` });
    }

    order.status = "Cancelled";
    order.paymentInfo.paymentStatus = "Failed";
    order.trackingHistory.push({
      status: "Cancelled",
      location: "User",
      note: "Order cancelled by user",
      dateTime: new Date()
    });

    await order.save();

    if (order.user?.email) {
      await sendEmail(
        order.user.email,
        `❌ Order ${order.orderId} Cancelled`,
        `Hi ${order.user.name || "Customer"},<br>Your order <b>${order.orderId}</b> has been cancelled as per your request.`
      );
    }

    res.json({ message: "Order cancelled successfully" });
  } catch (error) {
    console.error("Cancel order error:", error);
    res.status(500).json({ message: "Failed to cancel order" });
  }
};
