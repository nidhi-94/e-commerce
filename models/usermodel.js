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
    purchases: [{ type: String, ref: "Product" }],
    activeplan: Object
},
    {
        timestamps: true
    });

export default mongoose.model("User", userSchema);