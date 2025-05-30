import mongoose from 'mongoose';
import Cart from '../models/cartmodel.js';
import Coupon from '../models/couponmodel.js';

export const getCart = async (req, res) => {
  try {
    const userId = req.user._id;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ message: "Invalid user ID" });
    }

    const cart = await Cart.findOne({ user: userId })
      .populate('items.product')
      .populate('coupon');

    res.json(cart || { items: [], coupon: null });
  } catch (err) {
    res.status(500).json({ message: 'Server Error', error: err.message });
  }
};

export const addToCart = async (req, res) => {
  try {
    const userId = req.user._id;
    const { productId, quantity } = req.body;

    if (!mongoose.Types.ObjectId.isValid(productId)) {
      return res.status(400).json({ message: "Invalid product ID" });
    }

    let cart = await Cart.findOne({ user: userId });
    if (!cart) cart = new Cart({ user: userId, items: [] });

    const item = cart.items.find(i => i.product.toString() === productId);
    if (item) {
      item.quantity += quantity;
    } else {
      cart.items.push({ product: productId, quantity });
    }

    await cart.save();
    res.json(cart);
  } catch (err) {
    res.status(500).json({ message: 'Server Error', error: err.message });
  }
};

export const updateCartItem = async (req, res) => {
  try {
    const userId = req.user._id;
    const { productId, quantity } = req.body;

    if (!mongoose.Types.ObjectId.isValid(productId)) {
      return res.status(400).json({ message: "Invalid product ID" });
    }

    const cart = await Cart.findOne({ user: userId });
    if (!cart) return res.status(404).json({ message: "Cart not found" });

    const item = cart.items.find(i => i.product.toString() === productId);
    if (item) item.quantity = quantity;

    await cart.save();
    res.json(cart);
  } catch (err) {
    res.status(500).json({ message: 'Server Error', error: err.message });
  }
};

export const removeCartItem = async (req, res) => {
  try {
    const userId = req.user._id;
    const { productId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(productId)) {
      return res.status(400).json({ message: "Invalid product ID" });
    }

    const cart = await Cart.findOne({ user: userId });
    if (!cart) return res.status(404).json({ message: "Cart not found" });

    cart.items = cart.items.filter(i => i.product.toString() !== productId);
    await cart.save();
    res.json(cart);
  } catch (err) {
    res.status(500).json({ message: 'Server Error', error: err.message });
  }
};

export const applyCoupon = async (req, res) => {
  try {
    const userId = req.user._id;
    const { code } = req.body;

    const cart = await Cart.findOne({ user: userId });
    if (!cart) return res.status(400).json({ message: "Cart not found" });

    const coupon = await Coupon.findOne({ code });
    if (!coupon || new Date() > coupon.expiresAt) {
      return res.status(400).json({ message: 'Invalid or expired coupon' });
    }

    cart.coupon = coupon._id;
    await cart.save();
    res.json(cart);
  } catch (err) {
    res.status(500).json({ message: 'Server Error', error: err.message });
  }
};
