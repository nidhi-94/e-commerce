import Order from "../models/ordermodel.js"
import generateInvoicePDF from "../utils/generateInvoice.js";
import { path } from "path";

export const downloadInvoice = async (req, res) => {
    try {
        const { orderId } = req.params;
        const order = await Order.findOne({ orderId })
            .populate("user", "name email")
            .populate("items.product", "title price")
            .lean();

        if (!order) return res.status(404).json({ message: "Order not found" });

        const filePath = path.resolve("invoices", `${orderId}.pdf`);
        await generateInvoicePDF(order, filePath);
        res.download(filePath);
        
    } catch (error) {
        console.error("Download invoice error:", error);
        res.status(500).json({ message: "Failed to generate invoice." });
    }
}