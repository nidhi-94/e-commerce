import mongoose from "mongoose";

const otpSchema = new mongoose.Schema({
    orderId: { type: mongoose.Schema.Types.ObjectId, ref: "Order", required: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    otp: { type: String, required: true },
    expiresAt: { type: Date, required: true },
    attempts: {type: Number, default: 0},
}, { timestamps: true });

export default mongoose.model("OrderOtp", otpSchema);