import mongoose from "mongoose";

const productSchema = new mongoose.Schema({
    title: { type: String, required: true},
    price: { type:Number, required: true},
    description: String,
    stock: { type: Number, default: 0},
    category: String,
    imageUrl: [{type: String}],
    brand: { type: String, default: "Generic"},
    rating: {type: Number, default: 0},
    numReviews: { type: Number, default: 0},
    tags: [{type: String}],
}, {
    timestamps: true,
});

productSchema.index({ title: "text", category: "text", description: "text" });
// productSchema.index({ tags: 1 });

export default mongoose.model("Product", productSchema);