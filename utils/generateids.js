import express from "express";
import Stripe from "stripe";
import Order from "../models/ordermodel.js";
import User from "../models/usermodel.js";
import dotenv from "dotenv";
import { sendEmail } from "../utils/sendEmail.js";

dotenv.config();
const router = express.Router()
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export const stripeWebhookHandler = async (req, res) => {
    const sig = req.headers["stripe-signature"];
    let event;

    try {
        event = stripe.webhooks.constructEvent(
            req.rawBody,
            sig,
            process.env.STRIPE_WEBHOOK_SECRET
        );
    } catch (error) {
        console.error("Webhook signature verification failed:", error.message);
        res.status(400).send(`Webhook Error: ${error.message}`);
    }

if(event.type === "checkout.session.completed"){
    const session = event.data.object;

    try {
        const order = await Order.findOne({"paymentInfo.sessionId": session.id });  
        if(order){
            order.paymentInfo.paymentStatus = "Paid";
            order.status = "Paid"; 
            order.trackingHistory.push({
                status: "Paid",
                location: "online payment",
                note: "Payment received via Stripe",
                dateTime: new Date()
            });
            await order.save();
            
            const user = await User.findById(order.user);
            if(user && user.email) {
                await sendEmail(
                    user.email,
                    "payment received - Order Confirmation",
                    `Dear ${user.name},\n\nYour payment for order ID ${order._id} has been successfully received. Thank you for your purchase!`
                )
            }
            console.log(`order updated after stripe payment: ${order._id}`);
        } else {
            console.warn(`No order found for session ID: ${session.id}`);
        } 
    } catch (error) {
        console.error("Error updating order after payment:", error);
    }
}
    res.status(200).json({ received: true });
};

export default router;