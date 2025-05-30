import mongoose from "mongoose";

const orderSchema = new mongoose.Schema({
    user: {type: mongoose.Schema.Types.ObjectId, ref: "User"},
    items: [{
        productId: {type: mongoose.Schema.Types.ObjectId, ref: "Product"},
        title: String, 
        price: Number,
        quantity: Number
    }],
    totalAmount: Number,
    status: {
        type: String, 
        enum: ["Processing", "Shipped", "Delivered", "Cancelled"],
        default: "Processing"},
    paymentInfo: Object
},{
    timestamps: true
});

export default mongoose.model("Order", orderSchema);