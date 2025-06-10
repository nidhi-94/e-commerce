import Stripe from "stripe";
import Order from "../models/ordermodel.js";
import dotenv from "dotenv";

dotenv.config();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export const stripeWebhook = async (req, res) => {
    const sig = req.headers['stripe-signature'];
    
    let event;
    try {
        event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
    } catch (error) {
        console.error("Webhook Error:", error.message);
        res.status(400).send(`Webhook Error: ${error.message}`);   
    }


if(event.type === 'checkout.session.completed') {
        const session = event.data.object; 

        const order = await Order.findOne({ "paymentInfo.sessionId": session.id });
        if(order){
            order.paymentInfo.paymentStatus = "Completed";
            order.status = "Paid"; 
            await order.save();
            console.log("Order updated after stripe payment.");
        }
    }
    res.status(200).json({ received: true });
};