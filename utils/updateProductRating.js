import Review from "../models/reviewmodel.js";
import Product from "../models/productmodel.js";

export const updateProductRating = async (productId) => {
    const reviews =  await Review.find({ product: productId });

    const totalReviews = reviews.length;
    const avgRating = reviews.reduce((sum, r) => sum + r.rating, 0) / totalReviews || 0;

    await Product .findByIdAndUpdate(productId, {
        rating: avgRating.toFixed(1),
        numReviews: totalReviews,
    });
};