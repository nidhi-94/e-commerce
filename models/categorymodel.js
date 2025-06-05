import mongoose from "mongoose";
import slugify from "slugify";

const categorySchema = new mongoose.Schema({
    categoryId: { type: String, unique: true },
    name: { type: String, required: true, unique: true },
    slug: { type: String, unique: true },
    icon: {
        url: { type: String, required: true },
        public_id: { type: String, required: true }
    },
    saleStart: Date,
    salePercentage: Number,
    quantity: { type: Number, default: 0}
}, {
    timestamps: true,
    toJSON: {
        transform: (doc, ret) => {
            delete ret._id;
            delete ret.__v;
            return ret;
        }
    }
});

categorySchema.pre("save", async function (next) {
    if(!this.categoryId){
     const randomCode =  Math.random().toString(36).substring(2, 6).toUpperCase();
        this.categoryId = `CAT-${randomCode}`;
    }

    if(!this.slug || this.isModified("name")){
        this.slug = slugify(this.name, {lower: true, strict: true});
    }
    next();
});

export default mongoose.model("Category", categorySchema);