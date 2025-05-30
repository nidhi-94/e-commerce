import Stripe from "stripe";
import Order from "../models/ordermodel.js";
import Product from "../models/productmodel.js";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export const createOrder = async (req, res) => {
    try {
        const { orderItems, paymentIntent, userId } = req.body;

        if (!orderItems || !Array.isArray(orderItems)) {
            return res.status(400).json({ error: "orderItems is required & must be an array" });
        }

        let totalAmount = 0;
        for ( const item of orderItems) {
            totalAmount += item.price * item.quantity;
        }
        
        const session = await stripe.checkout.sessions.create({
            payment_method_types: ["card"],
            line_items: orderItems.map(item => ({
                price_data: {
                    currency: "inr",
                    product_data: {
                        name: item.title
                    },
                    unit_amount: item.price * 100
                },
                quantity: item.quantity
            })),
            mode: "payment",
            success_url: `${process.env.FRONTEND_URL}/success`,
            cancel_url: `${process.env.CANCEL_URL}/cancel`
        });

        for (const item of orderItems) {
            await Product.findByIdAndUpdate(item.productId, {
                $inc: { stock: -item.quantity }
            });
        }
        const order = new Order({
            user: userId,
            items: orderItems,
            totalAmount,
            paymentInfo: {
                sessionId: session.id
            }
        });

        await order.save();

        res.json({ url: session.url });

    } catch (err) {
        console.error("Stripe order creation error:", err);
        res.status(500).json({ error: "Something went wrong while creating the order" });
    }
};

export const getStatusDistribution = async (req,res) => {
    try {
        const { from, to } = req.query;
        const match = {};
        if(from || to){
            match.createdAt = {};
            if(from) match.createdAt.$gte = new Date(from);
            if(to) match.createdAt.$lte = new Date(to);
        }
        
        const statusCount = await Order.aggregate([
            {
                $group: {
                    _id: "$status",
                    count: {$sum : 1}
                }
            }
        ]);

        const formatted = statusCount.reduce((acc, curr) => {
            acc[curr._id] = curr.count;
            return acc;
        }, {});
        res.json(formatted);
    } catch (error) {
        console.error("Error getting order status distribution:", error);
        res.status(500).json({message: "Failed to get order status distribution."});
    }
}