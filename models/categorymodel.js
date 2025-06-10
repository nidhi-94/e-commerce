import mongoose from "mongoose";

const categorySchema = new mongoose.Schema({
    name: { type: String, required: true, unique: true },
    slug: { type: String, unique: true },
    icon: {
        url: { type: String, required: true },
        public_id: { type: String, required: true }
    },
    isFeatured: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
    displayOrder: { type: Number, default: 0 }
}, {
    timestamps: true,
});

export default mongoose.model("Category", categorySchema);