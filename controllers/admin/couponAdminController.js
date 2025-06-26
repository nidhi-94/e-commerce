import moment from "moment";
import Coupon from "../../models/couponmodel.js";

export const createCoupon = async (req, res) => {
    try {
        const { code, type = "percentage", discountPercent, discountAmount, minOrderValue,
            productCategory, onlyForFirstOrder = false, maxUsage, startsAt, expiresAt, isActive = true, users = [],
        } = req.body;

        const existing = await Coupon.findOne({ code });
        if (existing) return res.status(400).json({ message: "coupon already exists." });

        const parsedStartsAt = startsAt && moment(startsAt, "DD/MM/YYYY", true);
        const parsedExpiresAt = expiresAt && moment(expiresAt, "DD/MM/YYYY", true);

        if (startsAt && (!parsedStartsAt.isValid())) {
            return res.status(400).json({ message: "Invalid start date format. Use DD/MM/YYYY" });
        }

        if (expiresAt && (!parsedExpiresAt.isValid())) {
            return res.status(400).json({ message: "Invalid expiry date format. Use DD/MM/YYYY" });
        }
        const newCoupon = new Coupon({
            code, type, discountPercent, discountAmount, minOrderValue,
            productCategory, onlyForFirstOrder, maxUsage,
            startsAt: parsedStartsAt ? parsedStartsAt.toDate() : undefined,
            expiresAt: parsedExpiresAt ? parsedExpiresAt.toDate() : undefined,
            isActive, users
        });
        await newCoupon.save();
        res.status(201).json({
            message: "coupon created successfully.",
            coupon: {
                ...newCoupon.toObject(),
                startsAt: parsedStartsAt ? parsedStartsAt.format("DD/MM/YYYY") : null,
                expiresAt: parsedExpiresAt ? parsedExpiresAt.format("DD/MM/YYYY") : null,
            },
        });
    } catch (error) {
        console.error("Coupon creation field:", error);
        res.status(500).json({ message: "Server error" });
    }
};

export const getCoupons = async (req, res) => {
    try {
        const coupons = await Coupon.find().sort({ createdAt: -1 });

        const formattedCoupons = coupons.map(coupon => ({
            ...coupon.toObject(),
            startsAt: moment(coupon.startsAt).format("DD/MM/YYYY"),
            expiresAt: coupon.expiresAt ? moment(coupon.expiresAt).format("DD/MM/YYYY") : null
        }));
        res.json(formattedCoupons);
    } catch (error) {
        res.status(500).json({ message: "Failed to fetch products." })
    }
};

export const deleteCoupon = async (req, res) => {
    try {
        const { id } = req.params;
        const deletedCoupon = await Coupon.findByIdAndDelete(id);
        if (!deletedCoupon) {
            return res.status(404).json({ message: "Coupon not found or already deleted." });
        }
        res.json({ message: "Coupon deleted successfully." });
    } catch (error) {
        res.status(500).json({ error: "Failed to delete coupon" });
    }
};

export const toggleCouponStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const coupon = await Coupon.findById(id);
        if (!coupon) return res.status(404).json({ error: "Coupon not found" });

        coupon.isActive = !coupon.isActive;
        await coupon.save();
        res.json({ message: `Coupon ${coupon.isActive ? 'activated' : 'deactivated'}.` });
    } catch (error) {
        res.status(500).json({ error: "Failed to toggle status" });
    }
};

export const filterCoupons = async (req, res) => {
    const { activeOnly, minUsage, search } = req.query;

    const filters = {};
    if (activeOnly) filters.isActive = true;
    if (minUsage) filters.usedCount = { $gte: parseInt(minUsage) };
    if(search){
        filters.code = { $regex: search, $options: "i"};
    }
    try {
    const filtered = await Coupon.find(filters).sort({ createdAt: -1 });
    res.json(filtered);
    } catch (error) {
    console.error("❌ FilterCoupons Error:", error.message);
    res.status(500).json({ message: "Server error while filtering coupons" });    
    }
};