import Stripe from "stripe";
import Order from "../../models/ordermodel.js";
import dotenv from "dotenv";
import { sendEmail } from "../../utils/sendEmail.js";

dotenv.config();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export const stripeWebhook = async (req, res) => {
  const sig = req.headers["stripe-signature"];
  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error("Stripe Webhook Error:", err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object;
    const order = await Order.findOne({ "paymentInfo.sessionId": session.id }).populate("user");

    if (order) {
      order.paymentInfo.paymentStatus = "Completed";
      order.paymentInfo.transactionId = session.payment_intent;
      order.status = "Paid";
      await order.save();

      console.log(`✅ Order ${order.orderId} marked as Paid`);

      if (order.user?.email) {
        const message = `🎉🎊Your payment for Order ${order.orderId} is successful. Thank you!`;
        await sendEmail(order.user.email, "Payment Successful", message);
      }
    }
  }
  if (event.type === "payment_intent.payment_failed") {
    const paymentIntent = event.data.object;
    const sessionId = paymentIntent.metadata?.session_id;

    if(sessionId){
      const order = await Order.findOne({ "paymentInfo.sessionId": sessionId}).populate("user");
      if (order) {
      order.paymentInfo.paymentStatus = "failed";
      order.status = "Canceled";
      await order.save();

      console.log(` Order ${order.orderId} marked as Paid`);

      if (order.user?.email) {
        const message = `Payment failed for Order ${order.orderId}</b>.<br>Please try again or contact support.`;
        await sendEmail(order.user.email, "Payment Failed", message);
      }
    }
    }
  }

  res.status(200).json({ received: true });
};
