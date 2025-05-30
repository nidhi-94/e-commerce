import mongoose from "mongoose";

const tokenSchema = new mongoose.Schema({
    user: {type: mongoose.Schema.Types.ObjectId, ref: "User", required: true},
    token: { type: String, required: true},
    role: { type: String, enum: ["USER", "ADMIN"], required: true},
    createdAt: { type: Date, default: Date.now, expires: "7d"}
});

export default mongoose.model("Token", tokenSchema);