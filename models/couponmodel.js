import mongoose from "mongoose";

const couponSchema = new mongoose.Schema({
    code: { type: String, required: true, unique: true },
    type: { 
        type: String, 
        enum: ['percentage', 'fixed', 'conditional'], 
        default: 'percentage' },
    discountPercent: Number,
    discountAmount: Number,
    minOrderValue: Number,
    onlyForFirstOrder: { type: Boolean, default: false },
    productCategory: [String],
    maxUsage: { type: Number, default: 1 },
    usedCount: { type: Number, default: 0 },
    usageByUser: [{
        user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        count: { type: Number, default: 0 }
    }],
    users: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    sale: { type: mongoose.Schema.Types.ObjectId, ref: "Sale" },
    startsAt: { type: Date, default: Date.now },
    expiresAt: Date,
    isActive: { type: Boolean, default: true },
}, {
    timestamps: true
});

export default mongoose.model("Coupon", couponSchema);