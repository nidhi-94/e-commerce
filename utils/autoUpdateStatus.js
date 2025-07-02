import Order from "../models/ordermodel.js";
import { sendEmail } from "./sendEmail.js";
import { estimateDeliveryByPincode } from "./pincodeETA.js";

const getDelaysbyEtaDays = (etaDays) => {
    const msPerDay = 24 * 60 * 60 * 1000;
    return {
        shippedDelay: etaDays === 3 ? 1 * msPerDay : 2 * msPerDay,
        outForDelivery: etaDays === 3 ? 2 * msPerDay : 5 * msPerDay,
        deliverdDelay: etaDays * msPerDay
    };
};

export const autoUpdateStatus = async (orderId) => {

    const order = await Order.findOne({ orderId }).populate("user");
    if (!order || !order.shippingAddress?.pincode) {
        console.log("Order not found or pincode missing for:", orderId);
        return
    }
    const pincode = order.shippingAddress.pincode;
    const etaDays = estimateDeliveryByPincode(pincode);
    const { shippedDelay, outForDeliveryDelay, deliveredDelay } = getDelaysbyEtaDays(etaDays);

    const timeLine = [
        {
            status: "Shipped",
            delay: shippedDelay,
            location: "Main Warehouse",
            note: "Order has been packed and shipped."
        },
        {
            status: "Out for Delivery",
            delay: outForDeliveryDelay,
            location: "Local Hub",
            note: "Courier is on the way."
        },
        {
            status: "Delivered",
            delay: deliveredDelay,
            location: "Customer Address",
            note: "Order delivered to customer."
        }
    ];

    const statusPriority = {
        "Processing": 1,
        "Paid": 2,
        "Shipped": 3,
        "Out for Delivery": 4,
        "Delivered": 5,
        "Cancelled": 6
    }

    for (const { status, delay, location, note } of timeLine) {
        setTimeout(async () => {
            const currentOrder = await Order.findOne({ orderId }).populate("user");

            if (!currentOrder || ["Delivered", "Cancelled"].includes(currentOrder.status)) {
                console.log(`Skipping update for ${orderId}, current status: ${currentOrder?.status}`);
                return;
            }

            if (statusPriority[status] <= statusPriority[order.status]) {
                console.log(`Skipping dublicate/lower status "${status}" for order ${orderId}`);
                return;
            }
            currentOrder.status = status;
            currentOrder.trackingHistory.push({
                status,
                location,
                note,
                dateTime: new Date()
            });

            await currentOrder.save();
            if (currentOrder.user?.email) {
                await sendEmail(
                    currentOrder.user.email,
                    `🚚 Your Order ${currentOrder.orderId} is now ${status}`,
                    `Hi ${currentOrder.user.name || "Customer"},<br>Your order status is now: <b>${status}</b><br>${note}<br>Thanks!`
                );
            }
            console.log(`✅ Order ${orderId} status updated to '${status}'`);
        }, delay);
    }
};