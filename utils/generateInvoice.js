import PDFDocument from "pdfkit";
import fs from "fs";

export const generateInvoicePDF = (order, filePath = `./invoices/${order.orderId}.pdf`) => {
    return new Promise((resolve, reject) => {
        const doc = new PDFDocument();

        const stream = fs.createWriteStream(filePath)
        doc.pipe(stream);
        doc.fontSize(20).text(`INVOICE: ${order.orderId}`, { align: "center" });
        doc.moveDown().fontSize(14).text(`Customer: ${order.user.name} (${order.user.email})`);
        doc.text(`Date: ${new Date(order.createdAt).toLocaleDateString("en-IN")}`);
        doc.text(`Total: ₹${order.grandTotal}`);
        doc.moveDown();

        order.items.forEach((item, i) => {
            doc.text(`${i + 1}. ${item.product.title} - ₹${item.price} x ${item.quantity}`);
        });

        doc.end();

        stream.on("finish", () => resolve(filePath));
        stream.on("error", reject);
    });
}