import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, unique: true, required: true },
    password: { type: String, required: true },
    role: {
        type: String,
        enum: ["USER", "ADMIN"],
        default: "USER",
    },
    refreshToken: String,
    cart: [{
        product: { type: mongoose.Schema.Types.ObjectId, ref: "Product" },
        quantity: { type: Number, default: 1 }
    }],
    orders: [{ type: mongoose.Schema.Types.ObjectId, ref: "Order" }]
},
    {
        timestamps: true
    });

export default mongoose.models.User || mongoose.model("User", userSchema);