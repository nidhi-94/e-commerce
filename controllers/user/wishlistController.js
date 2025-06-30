import Wishlist from "../../models/wishlistmodel.js";
import Cart from "../../models/cartmodel.js";

export const getWishlist = async (req, res) => {
    try {
        const wishlist = await Wishlist.findOne({ user: req.user._id }).populate("items.product");
        res.json(wishlist?.items || []);
    } catch (error) {
        console.log("Error fetching wishlist:", error.message);
        res.status(500).json({ message: "Failed to get wishlist." });
    }
};

export const addToWishlist = async (req, res) => {
    try {
        console.log("🔍 req.body:", req.body);
        const { productId } = req.body;
        if (!productId) {
            return res.status(400).json({ message: "Missing productId in request body." });
        }

        let wishlist = await Wishlist.findOne({ user: req.user._id });
        if (!wishlist) {
            wishlist = new Wishlist({ user: req.user._id, items: [] });
        }

        const alreadyExists = wishlist.items.some(item => item.product.toString() === productId);
        if (alreadyExists) {
            return res.status(400).json({ message: "Product already in wishlist." });
        }

        wishlist.items.push({ product: productId });
        await wishlist.save();
        res.json({ message: "Added to wishlist." });
    } catch (error) {
        console.log("Error adding to wishlist:", error.message);
        return res.status(500).json({ message: "Failed to add to wishlist" });
    }
};

export const removeFromWishlist = async (req, res) => {
    try {
        const { productId } = req.params;
        const wishlist = await Wishlist.findOneAndUpdate(
            { user: req.user._id },
            { $pull: { items: { product: productId } } },
            { new: true }
        );
        res.json({ message: "Removed from wishlist.", wishlist });
    } catch (error) {
        console.error("Error removing from wishlist:", error.message);
        res.status(500).json({ message: "Failed to remove from wishlist." })
    }
};

export const moveToCart = async (req, res) => {
    try {
        const userId = req.user._id;
        const { productId } = req.body;

        const wishlist = await Wishlist.findOneAndUpdate(
            { user: userId },
            { $pull: { items: { product: productId } } },
            { new: true }
        );
        if (!wishlist) {
            return res.status(404).json({ message: "Wishlist not found." });
        }

        let cart = await Cart.findOne({ user: userId });
        if (!cart) {
            cart = new Cart({ user: userId, items: [] });
        }

        const exists = cart.items.find(item => item.product.toString() === productId);
        if (exists) {
            exists.quantity += 1;
        } else {
            cart.items.push({ product: productId, quantity: 1 });
        }
        await cart.save();
        res.json({
            message: "Moved to cart",
            cart,
            wishlist
        });
    } catch (error) {
        console.log("Error moving to cart:", error.message);
        res.status(500).json({ message: "Failed to remove from cart. " });
    }
};