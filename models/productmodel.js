import mongoose from "mongoose";

const productSchema = new mongoose.Schema({
    title: { type: String, required: true },
    slug: { type: String, unique: true },
    description: String,
    price: { type: Number, required: true },
    stock: { type: Number, default: 0 },
    category: String,
    imageUrl: {
        type: [{
            url: { type: String, required: true },
            public_id: { type: String, required: true }
        }],
        validate: [arr => arr.length > 0, "At least one image is required"]
    },
    brand: { type: String, default: "Generic" },
    rating: { type: Number, default: 0 },
    numReviews: { type: Number, default: 0 },
    tags: [{ type: String }],
}, {
    timestamps: true});

export default mongoose.model("Product", productSchema);