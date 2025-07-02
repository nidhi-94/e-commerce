import mongoose from "mongoose";
import Order from "../../models/ordermodel.js";
import User from "../../models/usermodel.js";
import { Parser } from "json2csv";
import { sendEmail } from "../../utils/sendEmail.js";
import path from "path";
import { generateInvoicePDF } from "../../utils/generateInvoice.js";
import fs from "fs";

const updateOrderStatusHelper = async (order, status, location = "Warehouse", note = "") => {
    order.status = status;
    order.trackingHistory.push({
        status,
        location,
        note: note || `Status updated to ${status}`,
        dateTime: new Date()
    });

    await order.save();

    if (order.user?.email) {
        await sendEmail(
            order.user.email,
            `📦 Your Order ${order.orderId} is now ${status}`,
            `Hi ${order.user.name || "Customer"},<br>Your order <b>${order.orderId}</b> has been updated to: <b>${status}</b>.<br>${note ? `<i>${note}</i><br>` : ""}Thank you!`
        );
    }
};

export const getOrderList = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const { status, userId, search } = req.query;
        console.log("Incoming query params:", req.query);

        const filter = {};
        if (status) { filter.status = status; }

        if (search) {
            const users = await User.find({
                $or: [
                    { name: { $regex: search, $options: "i" } },
                    { email: { $regex: search, $options: "i" } }
                ]
            }).select("_id");
            filter.user = { $in: users.map(u => u._id) };
        } else if (userId) {
            if (mongoose.Types.ObjectId.isValid(userId)) {
                console.log("Received userId filter:", userId);
                filter.user = new mongoose.Types.ObjectId(userId);
                console.log("Final filter used:", filter);
            } else {
                return res.status(400).json({ message: "Invalid userId format" });
            }
        }

        const orders = await Order.find(filter)
            .populate("user", "name email")
            .populate("items.product", "title price imageUrl")
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(limit)
            .lean();

        console.log("Fetched orders count:", orders.length);

        const total = await Order.countDocuments(filter);

        const orderList = orders.map(order => ({
            orderId: order.orderId,
            user: order.user?.name || order.user?.email || "Unknown",
            products: order.items.map(i => i.product?.title || "Unknown").join(", "),
            totalQuantity: order.items.reduce((acc, i) => acc + i.quantity, 0),
            totalPrice: order.grandTotal || order.totalAmount,
            status: order.status,
            paymentMethod: order.paymentInfo?.method || "N/A",
            orderPlaced: new Date(order.createdAt).toLocaleDateString("en-IN"),
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
        const { id } = req.params;
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ message: "Invalid order ID." });
        }

        const order = await Order.findById(id)
            .populate("user", "name email")
            .populate("items.product", "title price imageUrl")
            .lean();

        if (!order) return res.status(404).json({ message: "Order not found" });
        console.log("Fetched order:", id);
        res.json({
            ...order,
            trackingHistory: (order.trackingHistory || []).sort((a, b) =>
                new Date(b.dateTime) - new Date(a.dateTime)
            )
        });
    } catch (error) {
        console.error("Error fetching order details:", error);
        res.status(500).json({ message: "Failed to fetch order details" });
    }
};

export const updateOrderStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status, location, note } = req.body;

        const validStatuses = ["Processing", "Paid", "Shipped", "Out for Delivery", "Delivered", "Cancelled"];
        if (!validStatuses.includes(status)) {
            return res.status(400).json({ message: "Invalid status value." });
        }

        const order = await Order.findById(id).populate("user");
        if (!order) return res.status(404).json({ message: "Order not found" });

        if (order.status !== status) {
            await updateOrderStatusHelper(order, status, location, note);
        }

        res.json({ message: "Order updated successfully", order });
    } catch (error) {
        console.error("Admin updateOrderStatus error:", error);
        res.status(500).json({ message: "Failed to update order" });
    }
};

export const updateOrderStatusManually = async (req, res) => {
    try {
        const { orderId } = req.params;
        const { status, location, note } = req.body;

        const order = await Order.findOne({ orderId });
        if (!order) return res.status(404).json({ message: "Order not found" });

        await updateOrderStatusHelper(order, status, location, note);
        res.json({ message: "Order status updated." });
    } catch (error) {
        console.error("Manual status update error:", error);
        res.status(500).json({ message: "Failed to update status" });
    }
};

export const getStatusDistribution = async (req, res) => {
    try {
        console.log("📊 [STATUS DIST] Endpoint hit");
        const { from, to } = req.query;
        console.log("📅 Date Range:", { from, to });
        const match = {};

        if (from || to) {
            match.createdAt = {};
            if (from) {
                const fromDate = new Date(from);
                match.createdAt.$gte = fromDate;
                console.log("🟢 From Date:", fromDate);
            }
            if (to) {
                const toDate = new Date(to);
                match.createdAt.$lte = toDate;
                console.log("🔵 To Date:", toDate);
            }
        }

        const pipeline = [
            ...(Object.keys(match).length ? [{ $match: match }] : []),
            { $group: { _id: "$status", count: { $sum: 1 } } }
        ];
        console.log("🛠️ Aggregation Pipeline:", JSON.stringify(pipeline, null, 2));

        const result = await Order.aggregate(pipeline);
        console.log("📦 Aggregation Result:", result);

        const distribution = result.reduce((acc, curr) => {
            acc[curr._id] = curr.count;
            return acc;
        }, {});
        console.log("✅ Final Distribution:", distribution);
        res.json(distribution);
    } catch (error) {
        console.error("Admin getStatusDistribution error:", error);
        res.status(500).json({ message: "Failed to get order status distribution." });
    }
};

export const exportOrdersCSV = async (req, res) => {
    try {
        const orders = await Order.find()
            .populate("user", "name email")
            .populate("items.product", "title price")
            .lean();

        const flatOrders = orders.map(order => ({
            orderId: order.orderId,
            userName: order.user?.name || "N/A",
            userEmail: order.user?.email || "N/A",
            totalAmount: order.totalAmount,
            grandTotal: order.grandTotal,
            paymentMethod: order.paymentInfo?.method || "N/A",
            status: order.status,
            createdAt: new Date(order.createdAt).toLocaleDateString("en-IN"),
            expectedDelivery: order.expectedDeliveryDate
                ? new Date(order.expectedDeliveryDate).toLocaleDateString("en-IN")
                : "N/A",
            products: order.items.map(i => `${i.product?.title || "Unknown"} x${i.quantity}`).join(","),
        }));

        const json2csvParser = new Parser();
        const csv = json2csvParser.parse(flatOrders);

        res.header("Content-Type", "text/csv");
        res.attachment("orders.csv");
        res.send(csv);

    } catch (error) {
        console.error("Error exporting orders to csv:", error);
        return res.status(500).json({ message: "Failed to export csv." })
    }
};

export const previewInvoice = async (req, res) => {
    try {
        const { orderId } = req.params;
        console.log("📄 Invoice preview requested for:", orderId);
        const order = await Order.findById(orderId).populate("user").populate("items.product");
        if (!order) {
            console.log("❌ Order not found");
            return res.status(404).json({ message: "Order not found. " });
        }
        const invoiceDir = path.resolve("./invoices");
        const invoicePath = path.resolve(invoiceDir, `${order._id}.pdf`);

        if (!fs.existsSync(invoiceDir)) {
            fs.mkdirSync(invoiceDir);
        }

        await generateInvoicePDF(order, invoicePath);
        console.log("✅ Invoice generated at:", invoicePath);
        res.sendFile(invoicePath);
    } catch (error) {
        console.error("Invoice preview error:", error);
        res.status(500).json({ message: "Failed to preview invoice." })
    }
};