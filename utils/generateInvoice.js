import PDFDocument from "pdfkit";
import fs from "fs";

export const generateInvoicePDF = async (order, filePath) => {
    return new Promise((resolve, reject) => {
        const doc = new PDFDocument({ size: "A4", margin: 50 });

        const stream = fs.createWriteStream(filePath)
        doc.pipe(stream);

        doc.fontSize(20).text("Order Invoice", { align: "center" }).moveDown();
        doc.fontSize(12).text(`Order ID: ${order.orderId}`);
        doc.text(`Customer: ${order.user?.name || "N/A"}`);
        doc.text(`Email: ${order.user?.email || "N/A"}`);
        doc.text(`Date: ${new Date(order.createdAt).toLocaleDateString("en-IN")}`);
        doc.moveDown();

        doc.text("Shipping Address:");
        const addr = order.shippingAddress || {};
        doc.text(`${addr.fullName}, ${addr.street}, ${addr.city}, ${addr.state}, ${addr.postalCode}, ${addr.country}`).moveDown();

        doc.text("Items:");
        order.items.forEach(item => {
            doc.text(`${item.product?.title || "Product"} - Qty: ${item.quantity} - ₹${item.price}`);
        });

        doc.moveDown();
        doc.text(`Subtotal: ₹${order.totalAmount}`);
        doc.text(`Shipping: ₹${order.shippingCharges}`);
        doc.text(`Tax: ₹${order.taxAmount}`);
        doc.text(`Grand Total: ₹${order.grandTotal}`);
        doc.moveDown().text("Thank you for your purchase!");

        doc.end();

        stream.on("finish", () => resolve(filePath));
        stream.on("error", reject);
    });
}