import User from "../models/usermodel.js";
import Order from "../models/ordermodel.js";
import Product from "../models/productmodel.js";

//GET-ALL-USER
export const getAllUsers = async (req, res) => {
    try {
        const users = await User.find().select("-password");
        res.json(users);
    } catch (err) {
        res.status(500).json({ message: "Error fetching users", error: err.message });
    }
};

//ADMIN-DASHBOARD-OVERVIEW
export const getAdminOverview = async (req, res) => {
    try {
        const interval = req.query.interval || "monthly";

        const now = new Date();
        let startDate;

        if (interval === "daily") {
            startDate = new Date(now.setDate(now.getDate() - 1));
        } else if (interval === "weekly") {
            startDate = new Date(now.setDate(now.getDate() - 7));
        } else {
            startDate = new Date(now.setMonth(now.getMonth() - 1));
        }

        const $groupFormat =
            interval === "daily" ? "%Y-%m-%d" :
                interval === "Weekly" ? "%Y-%U" :
                    "%Y-%m";

        const [totalUser, totalOrder, totalProduct] = await Promise.all([
        User.countDocuments({ createdAt: { $gte: startDate } }),
        Order.countDocuments({ createdAt: { $gte: startDate } }),
        Product.countDocuments()
        ]);


const totalRevenue = await Order.aggregate([
    {
        $match: {
            createdAt: { $gte: startDate }
        }
    },
    { $group: { _id: null, total: { $sum: "$totalAmount" } } }
]);



const saleByDate = await Order.aggregate([
    {
        $match: {
            createdAt: { $gte: startDate }
        }
    },
    {
        $group: {
            _id: { $dateToString: { format: $groupFormat, date: "$createdAt" } },
            total: { $sum: "$totalAmount" },
            count: { $sum: 1 }
        }
    },
    {
        $sort: { _id: 1 }
    }
])
res.json({
    totalUser,
    totalOrder,
    totalProduct,
    totalRevenue: totalRevenue[0]?.total || 0,
    saleByDate
});
    } catch (err) {
    res.status(500).json({ message: "Error fetching Analytics", error: err.message });
}
}