import mongoose from "mongoose";
import Product from "../models/productmodel.js";
import Review from "../models/reviewmodel.js";
import { uploadToCloudinary, deleteFromCloudinary } from "../utils/cloudinaryupload.js";
import { generateUniqueId } from "../utils/generateIds.js";

async function findProductByProductId(productId) {
    return await Product.findOne({ productId });
}

export const createProduct = async (req, res) => {
    try {
        console.log("Received req.body:", req.body);
        console.log("Received req.files:", req.files);
        console.log("req.headers:", req.headers);


        const { title, price, description, stock, category, brand, rating, numReviews, tags } = req.body;
        const imageUrl = [];

        if (req.files && req.files.length > 0) {
            for (const file of req.files) {
                const result = await uploadToCloudinary(file)
                imageUrl.push({
                    url: result.secure_url,
                    public_id: result.public_id
                });
            }
        }

        const productId = await generateUniqueId("PROD", "Product", "productId");

        const product = new Product({
            productId,
            title,
            price,
            description,
            stock,
            category,
            imageUrl,
            brand,
            rating: rating || 0,
            numReviews: numReviews || 0,
            tags: req.body.tags.replace(/['"]+/g, '').split(",").map(tag => tag.trim())
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
            tags: req.body.tags.replace(/['"]+/g, '').split(",").map(tag => tag.trim())
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

        const product = await findProductByProductId(req.params.id);
        if (!product) return res.status(404).json({ message: "Product not found." })

        if (req.files && req.files.length > 0) {
            for (const img of product.imageUrl) {
                await deleteFromCloudinary(img.public_id);
            }

            const imageUrls = [];
            for (const file of req.files) {
                const result = await uploadToCloudinary(file);
                imageUrls.push({
                    url: result.secure_url,
                    public_id: result.public_id
                });
            }
            updateData.imageUrl = imageUrls;
        }

        if (updateData.tags && typeof updateData.tags === "string") {
            updateData.tags = updateData.tags.split(".").map((tag) => tag.trim());
        }

        const updatedProduct = await Product.findByIdAndUpdate(
            product._id, 
            updateData,
            { new: true });
        res.json({ message: "Product updated", product: updatedProduct });
    } catch (error) {
        res.status(500).json({ message: "Failed to update the product.", error: error.message });
    }
};

export const deleteProduct = async (req, res) => {
    try {
        const product = await findProductByProductId(req.params.id);
        if (!product) return res.status(404).json({ message: "Product not found." });

        if (product.imageUrl && product.imageUrl.length > 0) {
            for (const img of product.imageUrl) {
                await deleteFromCloudinary(img.public_id);
            }
        }
        await product.findByIdAndDelete(product._id);
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

        const product = await findProductByProductId(productId);
        if (!product) return res.status(404).json({ message: "Product not found" });

        const existingReview = await Review.findOne({ user: userId, product: product._id });
        if (existingReview) return res.status(400).json({ message: "You have already reviewed this product." });

        const review = new Review({
            user: userId,
            product: product._id,
            rating,
            comment
        });

        await review.save();

        const reviews = await Review.find({ product: product._id });
        const totalRatings = reviews.reduce((sum, r) => sum + r.rating, 0);
        product.rating = (totalRatings / reviews.length).toFixed(1);
        product.numReviews = reviews.length;
        await product.save();

        res.status(201).json({ message: "Review added.", review });
    } catch (error) {
        res.status(500).json({ message: "Failed to add Review.", error: error.message });
    }
}

export const getProductDetails = async (req, res) => {
    try {
        const id = req.params.id;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ message: "Invalid product id." });
        }
        const product = await Product.findById(id);

        if (!product) {
            return res.status(404).json({ message: "Product not found." });
        }
        res.json(product);
    } catch (error) {
        console.error("Get product details error:", error);
        res.status(500).json({message: "Failed fetch product details.", error: error.message});
    }
}