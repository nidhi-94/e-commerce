import fs from "fs";
import path from "path";
import { generateInvoicePDF } from "./generateInvoice";
import { sendEmail as sendAppEmail } from "./sendEmail";
import Order from "../models/ordermodel.js";

export const generateInvoiceForOrder = async (order) => {
    const invoiceDir = path.resolve("./invoices");
    if (!fs.existsSync(invoiceDir)) {
        fs.mkdirSync(invoiceDir);
    }
    const invoicePath = path.join(invoiceDir, `${order._id}.pdf`);
    await generateInvoicePDF(order, invoicePath);

    return invoicePath;
    ;
}

export const sendEmailWithOptionalAttachment = async (to, subject, html, attachmentPath = null) => {
    return await sendAppEmail(to, subject, html, attachmentPath);
};

export const fetchOrderIfOwnedByUser = async (orderId, userId) => {
    if (!orderId || !userId) throw new Error("Invalid parameters.");

    const order = await Order.findOne({ _id: orderId, user: userId })
        .populate("user")
        .populate("items.product");

    return order || null;
};

export const createTrackingEntry = (status, location = "Warehouse", note = "") => {
    return {
        status,
        location,
        note: note || `Status updated to ${status}`,
        dateTime: new Date()
    };
};

export const updateOrderStatusWithTracking = async (order, status, location = "Warehouse", note = "") => {
    const trackingHistory = createTrackingEntry(status, location, note);
    order.status = status;
    order.trackingHistory.push(trackingEntry);
    await order.save();
    if (order.user?.email) {
        await sendEmailWithOptionalAttachment(
            order.user.email,
            `📦 Your Order ${order.orderId} is now ${status}`,
            `Hi ${order.user.name || "Customer"},<br>Your order <b>${order.orderId}</b> has been updated to: <b>${status}</b>.<br>${note ? `<i>${note}</i><br>` : ""}Thank you!`
        );
    }

    return trackingEntry;
}