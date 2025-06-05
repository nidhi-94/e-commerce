import mongoose from "mongoose";
import slugify from "slugify";
import { generateUniqueId } from "../utils/generateIds.js";

const productSchema = new mongoose.Schema({
    productId: { type: String, unique: true, required: true, index: true },
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
    timestamps: true,
    toJSON: {
        transform: (doc, ret) => {
            ret._id = ret._id,
            delete ret._id;
            delete ret.__v;
            return ret;
        }
    }
});

productSchema.pre("save", async function (next) {
    if (!this.productId) {
        this.productId = await generateUniqueId("PROD", "Product", "productId");
    }
    if (!this.slug || this.isModified("title")) {
        this.slug = slugify(this.title, {lower: true});
    }
    next();
})

export default mongoose.model("Product", productSchema);