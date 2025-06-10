import Stripe from "stripe";
import Order from "../models/ordermodel.js";
import Product from "../models/productmodel.js";
import User from "../models/usermodel.js";
import mongoose from "mongoose";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export const createOrder = async (req, res) => {
    try {
        const { orderItems, userId, shippingAddress, paymentMethod, shippingCharges = 0, taxAmount = 0 } = req.body;

        if (!orderItems?.length) {
            return res.status(400).json({ error: "orderItems is required & must be an array" });
        }

        if (!userId || !paymentMethod || !shippingAddress) {
            return res.status(400).json({ error: "Missing required fields" });
        }

        const userExists = await User.findById(userId);
        if (!userExists) {
            return res.status(400).json({ error: "Invalid user ID" });
        }

        let subTotal = 0;
        const orderItemsFormatted = [];
        const stripeLineItems = [];

        for (const item of orderItems) {
            const product = await Product.findById(item.product);
            if (!product) {
                return res.status(400).json({ error: `${item.product} not found.` })
            }
            if (product.stock < item.quantity) {
                console.error(`Insufficient stock for ${product.title}. Requested: ${item.quantity}, Available: ${product.stock}`);
                return res.status(400).json({ error: `Insufficient stock for ${product.title}. Available: ${product.stock}` });
            }
            orderItemsFormatted.push({
                product: product._id,
                price: item.price,
                quantity: item.quantity
            });

            stripeLineItems.push({
                price_data: {
                    currency: "inr",
                    product_data: {
                        name: product.title
                    },
                    unit_amount: item.price * 100,
                },
                quantity: item.quantity
            });

            subTotal += item.price * item.quantity;

            await Product.updateOne(
                { _id: product._id },
                { $inc: { stock: -item.quantity } }
            );
        }

        const grandTotal = subTotal + shippingCharges + taxAmount;

        const stripeSession = await stripe.checkout.sessions.create({
            payment_method_types: ["card"],
            line_items: stripeLineItems,
            mode: "payment",
            success_url: `${process.env.FRONTEND_URL}/success`,
            cancel_url: `${process.env.CANCEL_URL}/cancel`
        });

        const calculatedDeliveryDate = new Date();
        calculatedDeliveryDate.setDate(calculatedDeliveryDate.getDate() + 7);

        const newOrder = new Order({
            user: userId,
            items: orderItemsFormatted,
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
            expectedDeliveryDate: calculatedDeliveryDate,
            trackingHistory: []
        });

        await newOrder.save();

        const generatedOrderId = `ORD-${newOrder._id.toString().slice(-6).toUpperCase()}`;
        newOrder.orderId = generatedOrderId;
        await newOrder.save();

        res.json({ url: stripeSession.url, orderId: generatedOrderId });

    } catch (err) {
        console.error("Stripe order creation error:", err);
        res.status(500).json({ error: "Something went wrong while creating the order" });
    }
};

export const getOrderList = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const { status, userId } = req.query;

        console.log("Incoming query params:", req.query);

        const filter = {};
        if (status) { filter.status = status; }

        if (userId) {
            console.log("Received userId filter:", userId);
            if (!mongoose.Types.ObjectId.isValid(userId)) {
                return res.status(400).json({ message: `Invalid userId: ${userId}` });
            }
            filter.user = new mongoose.Types.ObjectId(userId);
        }
        console.log("Final filter to be used:", filter);
        const orders = await Order.find(filter)
            .populate("user", "name email")
            .populate("items.product", "title price imageUrl")
            .select("orderId user items totalAmount status paymentInfo createdAt expectedDeliveryDate grandTotal")
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(limit)
            .lean();

        const total = await Order.countDocuments(filter);

        const orderList = orders.map(order => ({
            orderId: order.orderId,
            user: order.user?.name || order.user?.email || "Unknown",
            products: order.items.map(i => i.product?.title || "Unknown").join(", "),
            quantity: order.items.reduce((acc, i) => acc + i.quantity, 0),
            totalPrice: order.grandTotal || order.totalAmount,
            status: order.status,
            paymentMethod: order.paymentInfo.method || "N/A",
            orderPlacedDate: new Date(order.createdAt).toLocaleDateString("en-IN"),
            expectedDelivery: order.expectedDeliveryDate
                ? new Date(order.expectedDeliveryDate).toLocaleDateString("en-IN")
                : "N/A"
        }));

        res.json({
            page,
            limit,
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
            .populate("items.product", "title price imageUrl")
            .lean();

        if (!order) return res.status(404).json({ message: "Order not found" });

        res.json({
            ...order,
            trackingHistory: Array.isArray(order.trackingHistory)
                ? order.trackingHistory.sort((a, b) => new Date(a.dateTime) - new Date(b.dateTime)) : [],
        });
    } catch (error) {
        console.error("Error fetching order details:", error);
        res.status(500).json({ message: "Failed to fetch order details" });
    }
};


export const updateOrderStatus = async (req, res) => {
    try {
        const { orderId } = req.params;
        const { status, location, note } = req.body;

        const validStatuses = ["Processing", "Paid", "Shipped", "Out for Delivery", "Delivered", "Cancelled"];
        if (status && !validStatuses.includes(status)) {
            return res.status(400).json({ message: "Invalid status value." });
        }

        const order = await Order.findOne({ orderId });
        if (!order) return res.status(404).json({ message: "Order not found" });

        if (status) {
            order.status = status;

            order.trackingHistory.push({
                status,
                location: location || "Warehouse",
                note: note || `Status updated to ${status}`,
                dateTime: new Date()
            });
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

        const pipeline = [];
        if (from || to) {
            pipeline.push({ $match: match });
        }
        pipeline.push({
            $group: {
                _id: "$status",
                count: { $sum: 1 }
            },
        });

        const statusCount = await Order.aggregate(pipeline);

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