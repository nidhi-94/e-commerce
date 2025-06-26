import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, unique: true, required: true, trim: true, lowercase: true },
    password: { type: String, required: true },
    previousPasswords: [{ type: String }],
    mobile: { type: String },
    dob: { type: Date },
    gender: { type: String, enum: ["Male", "Female", "Other"] },
    location: { city: String, state: String, country: String },
    profilePic: { type: String, default: "" },
    profilePicId: { type: String, default: "" },
    role: {
        type: String,
        enum: ["USER", "ADMIN"],
        default: "USER",
    },
    refreshToken: String,
    purchases: [{ type: String, ref: "Product" }],
    activeplan: Object,
    otp: { code: String, expiresAt: Date },
    pendingEmail: String,
    passwordChangedHistory: [{
        changedAt: { type: Date, default: Date.now },
        ip: String
    }]
},
    {
        timestamps: true
    });

userSchema.virtual("joinedOn").get(function () {
    if (!this.createdAt) return null;
    const day = this.createdAt.getDate().toString().padStart(2, "0");
    const month = (this.createdAt.getMonth() + 1).toString().padStart(2, '0');
    const year = this.createdAt.getFullYear();
    return `${day}/${month}/${year}`;
});

userSchema.set("toJSON", {virtuals: true});
userSchema.set("toObject", { virtuals: true });

export default mongoose.model("User", userSchema);