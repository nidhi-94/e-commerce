import Order from "../models/ordermodel.js";

export const autoUpdateStatus = async (orderId) => {
    const timeLine =
        [{ status: "Shipped", delay: 15 * 1000, location: "Main Warehouse", note: "Order has been packed and shipped." },
        { status: "Out for Delivery", delay: 25 * 1000, location: "Local Hub", note: "Courier is on the way." },
        { status: "Delivered", delay: 35 * 1000, location: "Customer Address", note: "Order delivered to customer." }];

    for (const { status, delay, location, note } of timeLine) {
        setTimeout(async () => {
            const order = await Order.findOne({ orderId });
            if (!order || ["Cancelled", "Delivered"].includes(order.status)) return;

            order.status = status;
            order.trackingHistory.push({
                status,
                location,
                note,
                dateTime: new Date()
            });

            await order.save();
            console.log(`✅ Order ${orderId} status updated to '${status}'`);
        }, delay);
    }
};