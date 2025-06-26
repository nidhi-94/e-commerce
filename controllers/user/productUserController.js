import Product from "../../models/productmodel.js";
import Review from "../../models/reviewmodel.js";

export const getUserProductDetails = async (req, res) => {
    try {
        const { slug } = req.params;
        if (!slug) {
            return res.status(400).json({ message: "Slug is required." });
        }

        const product = await Product.findOne({ slug }).lean();
        if (!product) {
            return res.status(404).json({ message: "Product not found." });
        }
        await Product.updateOne({ slug }, { $inc: { views: 1 } });

        const reviews = await Review.find({ product: product._id })
            .populate("user", "name")
            .sort({ createdAt: -1 })
            .lean();

        const relatedProducts = await Product.find({
            category: product.category,
            slug: { $ne: slug }
        }).limit(6).select("title slug price imageUrl rating onSale").lean();

        res.status(200).json({
            success: true,
            product,
            reviews,
            relatedProducts
        });
    } catch (error) {
        console.error("Get product by slug error:", error);
        res.status(500).json({ message: "Failed to fetch product by slug.", error: error.message });
    }
}

export const getPopularProducts = async (req, res) => {
    try {
        const products = await Product.find()
            .sort({ rating: -1, numReviews: -1 })
            .limit(10);
        res.json(products);
    } catch (error) {
        res.status(500).json({ message: "Failed to fetch popular products.", error: error.message });
    }
}

export const getNewArrivals = async (req, res) => {
    try {
        const products = await Product.find()
            .sort({ createdAt: -1 })
            .limit(10);
        res.json(products);
    } catch (error) {
        res.status(500).json({ message: "Failed to fetch new arrivals.", error: error.message });
    }
}

export const getAllTags = async (req, res) => {
    try {
        const products = await Product.find({}, "tags");

        const allTags = [...new Set(products.flatMap(product => product.tags))];
        res.json(allTags);
    } catch (error) {
        res.status(500).json({ message: "Failed to fetch tags.", error: error.message });
    }
}

export const searchProducts = async (req, res) => {
    try {
        const { query } = req.query;
        if (!query) {
            return res.status(400).json({ message: "Search query is required." });
        }
        const regex = new RegExp(query, "i");
        const products = await Product.find({
            $or: [
                { title: regex },
                { description: regex },
                { tags: regex }
            ]
        }).sort({ createdAt: -1 });
        res.json(products);
    } catch (error) {
        res.status(500).json({ message: "Failed to search products.", error: error.message });
    }
}

export const filterProducts = async (req, res) => {
    try {
        const { category, brand, priceRange, rating, tags } = req.query;
        const query = {};

        if (category) query.category = category;
        if (brand) query.brand = brand;
        if (priceRange) {
            const [minPrice, maxPrice] = priceRange.split(",").map(Number);
            query.price = { $gte: minPrice, $lte: maxPrice };
        }
        if (rating) query.rating = { $gte: Number(rating) };
        if (tags) {
            const tagsArray = tags.split(",").map(tag => tag.trim());
            query.tags = { $in: tagsArray };
        }

        const products = await Product.find(query).sort({ createdAt: -1 });
        res.json(products);
    } catch (error) {
        res.status(500).json({ message: "Failed to filter products.", error: error.message });
    }
}   