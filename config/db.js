import mongoose from "mongoose";

const connectDB = async () => {
    try {
        await mongoose.connect("mongodb://localhost:27017/e-commerce");
        console.log("MongoDB connected");
    } catch (error) {
        console.error("MongoDB connection error:", error);
        process.exit(1);
    }
}

export default connectDB;