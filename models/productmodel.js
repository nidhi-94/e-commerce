import mongoose from "mongoose";

const productSchema = new mongoose.Schema({
    title: { type: String, required: true },
    slug: { type: String, unique: true },
    description: String,
    price: { type: Number, required: true },
    salePrice: Number,
    discountPercent: Number,
    onSale: { type: Boolean, default: false},
    saleEndsAt: Date,
    stock: { type: Number, default: 0 },
    category: String,
    brand: { type: String, default: "Generic" },
    imageUrl: {
        type: [{
            url: { type: String, required: true },
            public_id: { type: String, required: true }
        }],
        validate: [arr => arr.length > 0, "At least one image is required"]
    },
    variants: [{ 
        size: String,
        color: String,
        stock: { type: Number, default: 0 },
        price: Number
    }],
    specs: [{
        key: String,
        value: String
    }],
    weight: Number,
    dimensions: {
        length: Number,
        width: Number,
        height: Number
    },
    rating: { type: Number, default: 0 },
    numReviews: { type: Number, default: 0 },
    tags: [{ type: String }],
    isFeatured: { type: Boolean, default: false },
    views: { type: Number, default: 0 },
    metaTitle: String,
    metaDescription: String,
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" }
}, {
    timestamps: true});

export default mongoose.model("Product", productSchema);