import express from "express";
import connectDB from "./config/db.js";
import dotenv from "dotenv";
import cors from "cors";
import cookieParser from "cookie-parser";

import authRoutes from "./routes/authRoute.js";
import userRoutes from "./routes/userRoute.js";
import adminRoutes from "./routes/adminRoute.js";
// import cartRoutes from "./routes/cartRoute.js";
// import couponRoutes from "./routes/couponRoute.js";
import orderRoutes from "./routes/orderRoute.js";
import productRoutes from "./routes/productRoute.js";
import { errorHandler } from "./middleware/errorHandler.js";
import statsRoutes from "./routes/statsRoute.js";
import categoryRoutes from "./routes/categoryRoute.js";

dotenv.config();
connectDB();
const app = express();

app.use(cors({
    origin: "http://localhost:5173",
    credentials: true
}));
app.use(express.json()); 
app.use(cookieParser());

app.use("/api/auth", authRoutes);
app.use("/api/user", userRoutes);   
app.use("/api/admin", adminRoutes);
// app.use("/api/cart", cartRoutes);
// app.use("/api/coupon", couponRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/products", productRoutes);
app.use("/api/stats", statsRoutes);
app.use("/api/categories", categoryRoutes);

app.use(errorHandler);

app.use(express.static("public"));

app.get("/", (req, res) => {
    res.send("API is up & runninng");
})

const PORT = process.env.PORT || 5200;

app.listen(PORT, '0.0.0.0', () => {
    console.log(`server is running on: ${PORT}`);
});