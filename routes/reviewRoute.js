import express from "express";
import { addReview } from "../controllers/productController.js";
import Review from "../models/reviewmodel.js";

const router = express.Router();

router.get("/:productId/reviews", async (req, res) => {
    try {
       const reviews = await Review.find({product: req.params.productId}).populate("user", "name");
       res.json(reviews); 
    } catch (error) {
        res.status(500).json({message: "Failed to fetch review", error: error.message});
    }
});

router.post("/:productId/reviews", requireAuth, addReview);

router.post("/:reviewId/upvote", requireAuth, async (req, res) => {
    const review = await Review.findById(req.params.reviewId);
    if (!review) return res.status(404).json({ message: "Review not found" });

    if (review.votedUsers.includes(req.user._id)) {
        return res.status(400).json({ message: "You already voted" });
    }

    review.helpfulVotes++;
    review.votedUsers.push(req.user._id);
    await review.save();

    res.json({ message: "Upvoted review", votes: review.helpfulVotes });
});


export default router;