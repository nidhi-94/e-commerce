import Coupon from "../models/couponmodel.js";
import Cart from "../models/cartmodel.js";

export const createCoupon = async (req, res) => {
    const { code, discount, expiresAt } = req.body;
    try {
        const coupon = new Coupon({ code, discount, expiresAt });
        await coupon.save();
        res.status(201).json(coupon);
    } catch (error) {
        console.error("Coupon creation field:", error);
        res.status(500).json({message: "Server error"});
    }
};

export const getCoupon = async (req, res) => {
    const coupon = await Coupon.findOne({ code: req.params.code });
    if (!coupon) return res.status(404).json({ message: "Coupon not found" });
    res.json(coupon);
};

export const applyCoupon = async (req, res) => {
    const userId = req.user._id;
    const { code } = req.body;

    try {
        const coupon = await Coupon.findOne({ code });

        console.log("Found coupon:", coupon);
        console.log("current date:", new Date());
        console.log("coupon expiry:", coupon?.expiresAt);
        
        if (!coupon || new Date() > coupon.expiresAt) {
            return res.status(400).json({ message: "Invalid or expired coupon" });
        }

        const cart = await Cart.findOne({ user: userId });
        if (!cart) {
            return res.status(400).json({ message: "Cart not found" });
        }
        cart.coupon = coupon._id;
        await cart.save();
        res.json({ message: "coupon applied", cart });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server error" });
    }
};