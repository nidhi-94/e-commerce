import express from "express";
import { requireAuth } from "../middleware/authmiddleware.js";
import { addToWishlist, getWishlist, moveToCart, removeFromWishlist } from "../controllers/user/wishlistController.js";

const router = express.Router();

router.use(requireAuth);
router.get("/", getWishlist);
router.post("/add", addToWishlist);
router.delete("/remove/:productId", removeFromWishlist);
router.post("/move-to-cart", moveToCart);

export default router;