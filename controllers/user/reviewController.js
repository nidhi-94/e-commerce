import Review from "../../models/reviewmodel.js";
import { updateProductRating } from "../../utils/updateProductRating.js";

export const createReview = async (req, res) => {
    try {
        const { rating, comment } = req.body;
        const { productId } = req.params;

        const review = new Review({
            user: req.user.userId,
            product: productId,
            rating,
            comment: comment,
        });

        await review.save();
        await updateProductRating(productId);
        res.status(201).json({ success: true, review });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

export const deleteReview = async (req, res) => {
    try {
        const review = await Review.findById(req.params.reviewId);
        if (!review) return res.status(404).json({ message: "Review not found." });

        await Review.findByIdAndDelete(req.params.reviewId);
        await updateProductRating(review.product);

        res.status(200).json({ message: "Review deleted" });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

export const updateReview = async (req, res) => {
    try {
        const { rating, comment } = req.body;
        const review = await Review.findById(req.params.reviewId);

        if (!review) return res.status(404).json({ message: "Review not found" });

        review.rating = rating;
        review.comment = comment;
        await review.save();

        await updateProductRating(review.product);

        res.status(200).json({ message: "Review updated", review });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
