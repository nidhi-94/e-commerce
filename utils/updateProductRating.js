import Review from "../models/reviewmodel.js";
import Product from "../models/productmodel.js";

export const updateProductRating = async(productId) => {
    const reviews =  await Review.find({ product: productId });

    const numReviews = reviews.length;
    const avgRating = reviews.reduce((acc, review) => acc + review.rating, 0)/ numReviews || 0;

    await Product .findByIdAndUpdate(productId, {
        rating: avgRating.toFixed(1),
        numReviews,
    });
};