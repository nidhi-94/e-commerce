import mongoose, { mongo } from "mongoose";

const wishlistSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    items: [{
        product: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Product"
        },
        addedAt: {
            type: Date,
            default: Date.now()
        }
    }]
}, { timestamps: true});

const Wishlist = mongoose.model("Wishlist", wishlistSchema);
export default Wishlist;