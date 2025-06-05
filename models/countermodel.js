import mongoose from "mongoose";

const counterSchema = new mongoose.Schema({
    id: { type: String, required: true},
    seq: {type: Number, default: 1000}
});

export default mongoose.model("Counter", counterSchema);