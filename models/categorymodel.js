import mongoose from "mongoose";

const categorySchema = new mongoose.Schema({
    name: { type: String, required: true, trim: true, maxlength: 100 },
    slug: { type: String, required: true, unique: true, lowercase: true, index: true },
    icon: {
        url: { type: String, required: true },
        public_id: { type: String, required: true }
    },
    isFeatured: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
    displayOrder: { type: Number, default: 1, unique: true, index: true }
}, {
    timestamps: true,
});

export default mongoose.model("Category", categorySchema);