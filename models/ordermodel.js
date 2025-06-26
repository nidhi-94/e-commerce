import mongoose from "mongoose";

const orderSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    items: [{
        product: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
        price: Number,
        quantity: Number
    }],
    totalAmount: { type: Number, required: true },
    discountAmount: { type: Number, default: 0 },
    appliedCoupon: {
        code: { type: String },
        discountValue: { type: String },
        type: { type: String },
    },
    shippingCharges: { type: Number, default: 0 },
    taxAmount: { type: Number, default: 0 },
    grandTotal: { type: Number, required: true },
    status: {
        type: String,
        enum: ["Processing", "Shipped", "Out for Delivery", "Delivered", "Cancelled", "Paid"],
        default: "Processing"
    },
    paymentInfo: {
        method: { type: String },
        paymentStatus: { type: String, enum: ["Pending", "Completed", "Failed", "Paid"], default: "Pending" },
        transactionId: String,
        sessionId: String
    },
    shippingAddress: {
        fullName: String,
        street: String,
        city: String,
        state: String,
        postalCode: String,
        country: String,
        phone: String
    },

    expectedDeliveryDate: Date,
    trackingHistory: [{
        status: String,
        location: String,
        dateTime: Date,
        note: String
    },],
    orderId: { type: String, unique: true },
}, {
    timestamps: true
});

export default mongoose.model("Order", orderSchema);