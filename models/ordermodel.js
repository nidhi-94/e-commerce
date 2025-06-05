import mongoose from "mongoose";
import { generateUniqueId } from "../utils/generateIds.js";

const orderSchema = new mongoose.Schema({
    orderId: { type: String, unique: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    items: [{
        product: { type: mongoose.Schema.Types.ObjectId, ref: "Product"},
        productId: { type: String },
        title: String,
        price: Number,
        quantity: Number
    }],
    totalAmount: { type: Number, required: true },
    shippingCharges: { type: Number, default: 0 },
    taxAmount: { type: Number, default: 0 },
    grandTotal: { type: Number, required: true },
    status: {
        type: String,
        enum: ["Processing", "Shipped", "Delivered", "Cancelled"],
        default: "Processing"
    },
    paymentInfo: {
        method: { type: String },
        paymentStatus: { type: String, enum: ["Pending", "Completed", "Failed"], default: "Pending" },
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
        dateTime: Date
    }]

}, {
    timestamps: true,
    toJSON: {
        transform: (doc, ret) => {
            ret.id = ret._id;
            delete ret._id;
            delete ret.__v;
            return ret;
        }
    }
});

orderSchema.pre("save", async function (next) {
    if (!this.orderId) {
        this.orderId = await generateUniqueId("ORD", "Order", "orderId");
    }
    next();
})

export default mongoose.model("Order", orderSchema);