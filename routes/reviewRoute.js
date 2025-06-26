import express from "express";
import Review from "../models/reviewmodel.js";
import { createReview, updateReview, deleteReview } from "../controllers/user/reviewController.js";
import { requireAuth } from "../middleware/authmiddleware.js";

const router = express.Router();

// get reviews for a product
router.get("/:productId/reviews", async (req, res) => {
    try {
        const reviews = await Review.find({ product: req.params.productId }).populate("user", "name");
        res.json(reviews);
    } catch (error) {
        res.status(500).json({ message: "Failed to fetch review", error: error.message });
    }
});

//create new review
router.post("/:productId/reviews", requireAuth, createReview);

// PATCH update review
router.patch("/:reviewId", requireAuth, updateReview);

// DELETE review
router.delete("/:reviewId", requireAuth, deleteReview);

//POST upvote review
router.post("/:reviewId/upvote", requireAuth, async (req, res) => {
    try {
        const review = await Review.findById(req.params.reviewId);
        if (!review) return res.status(404).json({ message: "Review not found" });
        
        if (review.user.toString() === req.user.userId.toString()) {
            return res.status(400).json({ message: "You can't upvote your own review" });
        }

        if (review.votedUsers.includes(req.user.userId)) {
            return res.status(400).json({ message: "You already voted" });
        }

        review.helpfulVotes++;
        review.votedUsers.push(req.user.userId);
        await review.save();

        res.json({ message: "Upvoted review", votes: review.helpfulVotes });
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
export default router;