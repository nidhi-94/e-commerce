import mongoose from 'mongoose';
import Cart from '../../models/cartmodel.js';
import Coupon from '../../models/couponmodel.js';

export const getCart = async (req, res) => {
  try {
    const userId = req.user._id;
    console.log("🛒 User ID:", userId);

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ message: "Invalid user ID" });
    }

    const cart = await Cart.findOne({ user: userId })
      .populate('items.product')
      .populate('coupon');

    console.log("📦 Cart retrieved:", cart ? cart.items.length + " items" : "No cart found");
    res.json(cart || { items: [], coupon: null });
  } catch (err) {
    res.status(500).json({ message: 'Server Error', error: err.message });
  }
};

export const addToCart = async (req, res) => {
  try {
    const userId = req.user._id || req.user.userId;
    const { productId, quantity } = req.body;

    console.log("🛒 Adding to cart for user:", userId);
    console.log("📦 Product:", productId, "| Quantity:", quantity);
    if (quantity <= 0) return res.status(400).json({ message: "Quantity must be positive" });

    if (!mongoose.Types.ObjectId.isValid(productId)) {
      return res.status(400).json({ message: "Invalid product ID" });
    }

    let cart = await Cart.findOne({ user: userId });
    if (!cart) {
      console.log("no existing cart. creating new one.");
      cart = new Cart({ user: userId, items: [] });
    }

    const item = cart.items.find(i => i.product.toString() === productId);
    if (item) {
      item.quantity += quantity;
      console.log("🔁 Updating quantity for existing item.", item.quantity);
    } else {
      cart.items.push({ product: productId, quantity });
    }

    await cart.save();
    console.log("✅ Cart saved successfully.");
    res.json(cart);
  } catch (err) {
    console.error("❌ Error in addToCart:", err.message);
    res.status(500).json({ message: 'Server Error', error: err.message });
  }
};

export const updateCartItem = async (req, res) => {
  try {
    const userId = req.user._id;
    const { productId, quantity } = req.body || {};
    console.log("✏️ [UPDATE CART] User:", userId, "| Product:", productId, "| New Quantity:", quantity);

    if (!mongoose.Types.ObjectId.isValid(productId)) {
      console.log("❌ Invalid or missing product ID");
      return res.status(400).json({ message: "Invalid product ID" });
    }

    const cart = await Cart.findOne({ user: userId });
    console.log("🛒 Fetched cart:", cart);
    if (!cart) {
      console.log("cart not found for user.");
      return res.status(404).json({ message: "Cart not found" });
    }

    const item = cart.items.find(i => i.product.toString() === productId);
    if (!item) {
      console.log("🚫 Item not found in cart.");
      return res.status(404).json({ message: "Item not found in cart" });
    }

    if (item) item.quantity = quantity;
    console.log("✅ Quantity updated to:", quantity);

    await cart.save();
    console.log("cart updated successfully.");
    res.json(cart);
  } catch (err) {
    console.error("❌ [UPDATE CART] Server Error:", err.message);
    res.status(500).json({ message: 'Server Error', error: err.message });
  }
};

export const removeCartItem = async (req, res) => {
  try {
    const userId = req.user._id;
    const { productId } = req.params;
    console.log("❌ [REMOVE ITEM] User:", userId, "| Product:", productId);

    if (!mongoose.Types.ObjectId.isValid(productId)) {
      return res.status(400).json({ message: "Invalid product ID" });
    }

    const cart = await Cart.findOne({ user: userId });
    if (!cart) {
      return res.status(404).json({ message: "Cart not found" });
    }

    console.log("🧪 Checking product IDs in cart:");
    cart.items.forEach(i => console.log("🆔", i.product.toString(), "| Match:", i.product.equals(productId)));

    cart.items = cart.items.filter(i => !i.product.equals(productId));
    if (cart.items.length === 0) {
      await Cart.findByIdAndDelete(cart._id);
      console.log("Cart is empty.");
      return res.json({ message: "Item removed. Cart is now empty and deleted." });
    }

    await cart.save();
    console.log("✅ Item removed. Updated cart returned.");
    res.json(cart);
  } catch (err) {
    console.error("❌ Server Error while removing item:", err.message);
    res.status(500).json({ message: 'Server Error', error: err.message });
  }
};

export const clearCart = async (req, res) => {
  try {
    const userId = req.user._id;
    console.log("clearing cart for user:", userId);

    const cart = await Cart.findOne({ user: userId });
    if (!cart) {
      return res.status(404).json({ message: "Cart not found" });
    }

    await Cart.findByIdAndDelete(cart._id);
    console.log("🗑️ Cart deleted successfully.");
    res.json({ message: "Cart cleared successfully." });
  } catch (err) {
    console.error("❌ Error clearing cart:", err.message);
    res.status(500).json({ message: 'Server Error', error: err.message });
  }
};

export const applyCoupon = async (req, res) => {
  try {
    const userId = req.user._id;
    const { code } = req.body;
    console.log("🏷️ [APPLY COUPON] User:", userId, "| Code:", code);

    const cart = await Cart.findOne({ user: userId });
    if (!cart) {
      console.log("cart not found.");
      return res.status(400).json({ message: "Cart not found" });
    }

    const coupon = await Coupon.findOne({ code });
    if (!coupon || new Date() > coupon.expiresAt) {
      console.log("Invalid or expired coupon.");
      return res.status(400).json({ message: 'Invalid or expired coupon' });
    }

    cart.coupon = coupon._id;
    await cart.save();
    console.log("Coupon applied.");

    res.json(cart);
  } catch (err) {
    console.error("❌ [APPLY COUPON] Server Error:", err.message);
    res.status(500).json({ message: 'Server Error', error: err.message });
  }
};