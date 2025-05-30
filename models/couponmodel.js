import mongoose from "mongoose";

const couponSchema = new mongoose.Schema({
    code: String,
    discount: Number,
    expiresAt: Date
});

export default mongoose.model("Coupon", couponSchema);