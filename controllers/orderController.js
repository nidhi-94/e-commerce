import Stripe from "stripe";
import Order from "../models/ordermodel.js";
import Product from "../models/productmodel.js";
import User from "../models/usermodel.js";
import mongoose from "mongoose";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export const createOrder = async (req, res) => {
    try {
        const { orderItems, userId, shippingAddress, paymentMethod, shippingCharges = 0, taxAmount = 0, expectedDeliveryDate } = req.body;

        if (!orderItems || !Array.isArray(orderItems) || orderItems.length === 0) {
            await session.abortTransaction();
            session.endSession();
            return res.status(400).json({ error: "orderItems is required & must be an array" });
        }

        let subTotal = 0;

        const orderItemsFormatted = [];
        for (const item of orderItems) {
            const product = await Product.findOne({ productId: item.productId }).session(session);
            if (!product) {
                await session.abortTransaction();
                session.endSession();
                return res.status(400).json({ error: `${item.productId} not found.` })
            }
            if (product.stock < item.quantity) {
                await session.abortTransaction();
                session.endSession();
                return res.status(400).json({ error: `Insufficient stock for ${product.title}` });
            }
            orderItemsFormatted.push({
                product: product._id,
                productId: product.productId,
                title: product.title,
                price: item.price,
                quantity: item.quantity
            });
            subTotal += item.price * item.quantity;

            await Product.updateOne(
                { productId: item.productId },
                { $inc: { stock: -item.quantity } }
            );
        }

        const grandTotal = subTotal + shippingCharges + taxAmount;

        const stripeSession = await stripe.checkout.sessions.create({
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

        const userExists = await User.findById(userId).session(session);
        if (!userExists) {
            await session.abortTransaction();
            session.endSession();
            return res.status(400).json({ error: "Invalid user ID" });
        }

        const order = new Order({
            user: mongoose.Types.ObjectId(userId),
            items: orderItems.map(item => ({
                productId: item.productId,
                title: item.title,
                price: item.price,
                quantity: item.quantity
            })),
            totalAmount: subTotal,
            shippingCharges,
            taxAmount,
            grandTotal,
            status: "Processing",
            paymentInfo: {
                method: paymentMethod,
                paymentStatus: "Pending",
                sessionId: stripeSession.id
            },
            shippingAddress,
            expectedDeliveryDate,
            trackingHistory: []
        });

        await order.save({ session });

        await session.commitTransaction();
        session.endSession();

        res.json({ url: stripeSession.url, orderId: order.orderId });

    } catch (err) {
        await session.abortTransaction();
        session.endSession();
        console.error("Stripe order creation error:", err);
        res.status(500).json({ error: "Something went wrong while creating the order" });
    }
};

export const getOrderList = async (req, res) => {
    try {
        const { page = 1, limit = 10, status, userId } = req.query;
        const filter = {};
        if (status) filter.status = status;
        if (userId) filter.user = userId;

        const orders = await Order.find(filter)
            .populate("user", "name email")
            .populate("items.product", "title price imageUrl")
            .select("orderId user items totalAmount status paymentInfo createdAt")
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(Number(limit));

        const total = await Order.countDocuments(filter);

        const orderList = orders.map(order => ({
            orderId: order.orderId,
            user: order.user?.name || order.user?.email || "Unknown",
            products: order.items.map(i => i.title).join(", "),
            quantity: order.items.reduce((acc, i) => acc + i.quantity, 0),
            totalPrice: order.grandTotal || order.totalAmount,
            status: order.status,
            paymentMethod: order.paymentInfo.method || "N/A",
            orderPlacedDate: order.createdAt ? order.createdAt.toLocaleDateString("en-IN") : "N/A",
            expectedDelivery: order.expectedDeliveryDate ? new Date(order.expectedDeliveryDate).toLocaleDateString("en-IN") : "N/A"
        }));

        res.json({
            page: Number(page),
            limit: Number(limit),
            total,
            totalPages: Math.ceil(total / limit),
            orders: orderList
        });
    } catch (error) {
        console.error("Error fetching order list:", error);
        res.status(500).json({ message: "Failed to fetch order list." });
    }
}

export const getOrderDetails = async (req, res) => {
    try {
        const { orderId } = req.params;

        const order = await Order.findOne({ orderId })
            .populate("user", "name email")
            .populate("items.productId", "title price imageUrl");

        if (!order) return res.status(404).json({ message: "Order not found" });

        res.json({
            ...order.toObject(),
            trackingHistory: order.trackingHistory.sort(
                (a,b) => new Date(a.dateTime) - new Date(b.dateTime)
            )
        });
    } catch (error) {
        console.error("Error fetching order details:", error);
        res.status(500).json({ message: "Failed to fetch order details" });
    }
};


export const updateOrderStatus = async (req, res) => {
    try {
        const { orderId } = req.params;
        const { status, trackingUpdate } = req.body;

        const order = await Order.findOne({ orderId });
        if (!order) return res.status(404).json({ message: "Order not found" });

        if (status) order.status = status;

        if (trackingUpdate) {
            order.trackingHistory.push(trackingUpdate);
        }

        const validStatuses = ["Processing", "Shipped", "Delivered", "Cancelled"];
        if (status && !validStatuses.includes(status)) {
            return res.status(400).json({ message: "Invalid status value." });
        }

        await order.save();
        res.json({ message: "Order updated successfully", order });
    } catch (error) {
        console.error("Error updating order status:", error);
        res.status(500).json({ message: "Failed to update order" });
    }
};

export const getStatusDistribution = async (req, res) => {
    try {
        const { from, to } = req.query;
        const match = {};
        if (from || to) {
            match.createdAt = {};
            if (from) match.createdAt.$gte = new Date(from);
            if (to) match.createdAt.$lte = new Date(to);
        }

        const statusCount = await Order.aggregate([
            {
                $group: {
                    _id: "$status",
                    count: { $sum: 1 }
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
        res.status(500).json({ message: "Failed to get order status distribution." });
    }
}