import Product from "../models/productmodel.js";
import Review from "../models/reviewmodel.js";

export const createProduct = async (req, res) => {
    try {
        console.log("Received req.body:", req.body);
        console.log("Received req.files:", req.files);
        console.log("req.headers:", req.headers);


        const { title, price, description, stock, category, brand, rating, numReviews, tags } = req.body;
        const imageUrl = req.files && req.files.length > 0 ? req.files.map(file => file.path) : [];

        const product = new Product({
            title,
            price,
            description,
            stock,
            category,
            imageUrl: imageUrl,
            brand,
            rating: rating || 0,
            numReviews: numReviews || 0,
            tags: tags ? tags.split(",").map(tag => tag.trim()) : []
        });
        console.log("Product object to save:", {
            title,
            price,
            description,
            stock,
            category,
            imageUrl,
            brand,
            rating: rating || 0,
            numReviews: numReviews || 0,
            tags: tags ? tags.split(",").map(tag => tag.trim()) : []
        });

        await product.save();
        res.status(201).json({ message: "Product created.", product });
    } catch (error) {
        console.error("Create product error:", error);
        res.status(500).json({ message: "Failed to create a product", error: error.message });
    }
};

export const updateProduct = async (req, res) => {
    try {
        const updateData = req.body;

        if (req.files && req.files.length > 0) {
            updateData.imageUrl = req.files.map(file => file.path);
        }

        if (updateData.tags && typeof updateData.tags === "string") {
            updateData.tags = updateData.tags.split(",").map(tag => tag.trim());
        }

        const product = await Product.findByIdAndUpdate(req.params.id, updateData, { new: true });
        if (!product) return res.status(404).json({ message: "Product not found." });
        res.json({ message: "Product updated", product });
    } catch (error) {
        res.status(500).json({ message: "Failed to update the product.", error: error.message });
    }
};

export const deleteProduct = async (req, res) => {
    try {
        const product = await Product.findByIdAndDelete(req.params.id);
        if (!product) return res.status(404).json({ message: "Product not found." });
        res.json({ message: "Deleted successfully" });
    } catch (error) {
        res.status(500).json({ message: "Failed to delete product.", error: error.message });
    }
};


export const getAllProducts = async (req, res) => {
    try {
        const { page = 1, limit = 10, category, search } = req.query;
        const query = {};

        if (category) query.category = category;
        if (search) query.title = new RegExp(search, "i");

        const products = await Product.find(query)
            .skip((page - 1) * limit)
            .limit(parseInt(limit))
            .sort({ createdAt: -1 });

        const total = await Product.countDocuments(query);

        res.json({ products, totalPages: Math.ceil(total / limit), currentPage: parseInt(page) });
    } catch (error) {
        res.status(500).json({ message: "Failed to fetch products.", error: error.message });
    }
};

export const addReview = async (req, res) => {
    try {
        const { rating, comment } = req.body;
        const productId = req.params.productId;
        const userId = req.user._id;

        const product = await Product.findById(productId);
        if (!product) return res.status(404).json({ message: "Product not found" });

        const existingReview = await Review.findOne({ user: userId, product: productId });
        if (existingReview) return res.status(400).json({ message: "You have already reviewed this product." });

        const review = new Review({
            user: userId,
            product: productId,
            rating,
            comment
        });

        await review.save();

        const reviews = await Review.find({ product: productId });
        const totalRatings = reviews.reduce((sum, r) => sum + r.rating, 0);
        product.rating = (totalRatings / reviews.length).toFixed(1);
        product.numReviews = reviews.length;
        await product.save();

        res.status(201).json({ message: "Review added.", review });
    } catch (error) {
        res.status(500).json({ message: "Failed to add Review.", error: error.message });
    }
}