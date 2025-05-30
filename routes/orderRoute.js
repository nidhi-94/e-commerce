import express from "express";
import { createOrder, getStatusDistribution } from "../controllers/orderController.js";
import Order from "../models/ordermodel.js";

const router = express.Router();

router.post("/", createOrder);

router.get("/status-distribution", getStatusDistribution);

router.patch("/:orderId/status", async(req, res) => {
    try {
        const { orderId } = req.params;
        const { status } = req.body;

        if(!["Processing", "Shipped", "Delivered", "Cancelled"].includes(status)){
            return res.status(400).json({message: "Invalid status value"});
        }

        const order = await Order.findByIdAndUpdate(orderId, { status }, {new: true});
        if(!order) return res.status(404).json({message: "Order not found"});
        res.json(order);
    } catch (error) {
        console.error("Error updating order status:", error);
        res.status(500).json({message: "Internal server error."})
    }
})

export default router;