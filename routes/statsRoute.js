import express from "express";
import Order from "../models/ordermodel.js";
import User from "../models/usermodel.js";

const router = express.Router();

router.get("/overview", async (req, res) => {
    try {
        const { from, to } = req.query;

        const startDate = from ? new Date(from) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        const endDate = to ? new Date(to) : new Date();

        const totalOrder = await Order.countDocuments({
            createdAt: { $gte: startDate, $lte: endDate }
        });

        const incomeAgg = await Order.aggregate([
            {
                $match: {
                    createdAt: { $gte: startDate, $lte: endDate },
                    status: { $in: ["Delivered", "Processing"]}
                }
            },
            {
                $group: {
                    _id: null,
                    totalIncome: { $sum: "$totalAmount"}
                }
            }
        ]);

        const totalIncome = incomeAgg[0]?.totalIncome || 0;
        const totalVisitors = await User.countDocuments({
            createdAt: {$gte: startDate, $lte: endDate }
        });

        const saleByDate = await Order.aggregate([
            {
                $match: {
                    createdAt: {$gte: startDate, $lte: endDate},
                    status: {$in: ["Delivered", "Processing"]}
                }
            },
            {
                $group: {
                    _id: { $dateToString: {format: "%Y-%m-%d", date: "$createdAt"}},
                    totalSums: {$sum: "$totalAmount"},
                    count: {$sum: 1}
                }
            },
            {
                $sort: { _id: 1}
            }
        ]);

        res.json({
            totalOrder,
            totalIncome,
            totalVisitors,
            saleByDate
        })

    } catch (error) {
        console.error("Error in stats overview:", error);
        res.status(500).json({ message: "Failed to load overview." });
    }
})

export default router;