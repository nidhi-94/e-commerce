import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import { generateUniqueId } from "../utils/generateIds.js";

const userSchema = new mongoose.Schema({
    userId: { type: String, unique: true },
    name: { type: String, required: true },
    email: { type: String, unique: true, required: true },
    password: { type: String, required: true },
    role: {
        type: String,
        enum: ["USER", "ADMIN"],
        default: "USER",
    },
    refreshToken: String,
    purchases: [{ type: String, ref: "Product" }],
    activeplan: Object
},
    {
        timestamps: true,
        toJSON: {
            transform: (doc, ret) => {
                delete ret._id;
                delete ret.__v;
                delete ret.password;
                return ret;
            }
        }
    });

userSchema.pre("save", async function (next) {
    if (!this.userId) {
        this.userId = await generateUniqueId("USR", "User", "userId");
    }

    if (this.isModified("password")) {
        this.password = await bcrypt.hash(this.password, 10);
    }

    next();
});

export default mongoose.model("User", userSchema);