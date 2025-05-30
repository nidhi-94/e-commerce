import mongoose from "mongoose";

const cartSchema = new mongoose.Schema({
    user: {type: mongoose.Schema.Types.ObjectId, ref: "User"},
    items: [{
        product: {type: mongoose.Schema.Types.ObjectId, ref: "Product"},
        quantity: Number
    }],
    coupon: {type: mongoose.Schema.Types.ObjectId, ref: "Coupon"}
});

export default mongoose.model("Cart", cartSchema);