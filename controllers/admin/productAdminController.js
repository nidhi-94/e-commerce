import mongoose from "mongoose";
import Product from "../../models/productmodel.js";
import { uploadToCloudinary, deleteFromCloudinary } from "../../utils/cloudinaryupload.js";
import slugify from "slugify";

const toBoolean = val => val === "true" || val === true;

const calculateTotalVariantStock = (variants) => {
    return Array.isArray(variants)
        ? variants.reduce((sum, v) => sum + (v.stock || 0), 0)
        : 0;
};

const computeSale = (price, salePrice, salePercent) => {
    let discountPercent;
    let finalSalePrice = salePrice ? Number(salePrice) : undefined;

    if (salePercent && !finalSalePrice) {
        discountPercent = Number(salePercent);
        finalSalePrice = Math.round(price - (price * discountPercent / 100));
    } else if (finalSalePrice) {
        if (finalSalePrice > price) throw new Error("Sale price cannot be higher than the original price.");
        discountPercent = Math.round(100 - (finalSalePrice / price) * 100);
    }

    return { finalSalePrice, discountPercent };
}

const parseCustomDate = (input) => {
    const [day, month, year] = input.split("-");
    if (!day || !month || !year) return null;

    const isoString = `${year}-${month}-${day}`;
    const parsed = new Date(isoString);
    return isNaN(parsed.getTime()) ? null : parsed;
};

const formatToDDMMYYYY = (date) => {
    const d = new Date(date);
    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
};


// CREATE PRODUCT
export const createProduct = async (req, res) => {
    try {
        if (!req.user?._id) return res.status(401).json({ message: "Unauthorized" });

        const {
            title, price, description, salePrice, salePercent, saleEndsAt, stock, category,
            brand, rating, numReviews, tags, isFeatured, variants, specs,
            weight, dimensions, metaTitle, metaDescription
        } = req.body;

        const imageUrl = [];
        if (req.files?.length) {
            for (const file of req.files) {
                const result = await uploadToCloudinary(file);
                imageUrl.push({ url: result.secure_url, public_id: result.public_id });
            }
        }

        let slug = slugify(title, { lower: true, strict: true });
        let suffix = 1;
        while (await Product.findOne({ slug })) {
            slug = `${slugify(title, { lower: true, strict: true })}-${suffix++}`;
        }

        const tagsArray = typeof tags === "string" ? tags.split(",").map(t => t.trim()) : Array.isArray(tags) ? tags : [];
        const variantsArray = typeof variants === "string" ? JSON.parse(variants) : variants || [];
        const specsArray = typeof specs === "string" ? JSON.parse(specs) : specs || [];
        const dimensionsObj = typeof dimensions === "string" ? JSON.parse(dimensions) : dimensions || {};
        const totalVariantStock = calculateTotalVariantStock(variantsArray);

        let validSaleEndsAt;
        if (saleEndsAt) {
            const parsedDate = parseCustomDate(saleEndsAt);
            if (!parsedDate) {
                return res.status(400).json({ message: "Invalid sale end date format. Use DD-MM-YYYY." });
            }
            if (parsedDate < new Date()) {
                return res.status(400).json({ message: "Sale end date must be in the future." });
            }
            validSaleEndsAt = parsedDate;
        }

        const { finalSalePrice, discountPercent } = computeSale(Number(price), salePrice, salePercent);
        const shouldBeOnSale = finalSalePrice && validSaleEndsAt && validSaleEndsAt > new Date();

        const product = new Product({
            title,
            slug,
            price: Number(price),
            salePrice: finalSalePrice,
            discountPercent,
            onSale: shouldBeOnSale,
            saleEndsAt: validSaleEndsAt,
            description,
            stock: totalVariantStock || Number(stock) || 0,
            category,
            imageUrl,
            brand,
            rating: Number(rating) || 0,
            numReviews: Number(numReviews) || 0,
            tags: tagsArray,
            isFeatured: toBoolean(isFeatured),
            variants: variantsArray,
            specs: specsArray,
            weight: weight ? Number(weight) : undefined,
            dimensions: dimensionsObj,
            metaTitle: metaTitle || title,
            metaDescription: metaDescription || description?.substring(0, 160),
            createdBy: req.user?._id || undefined
        });

        const savedProduct = await product.save();

        const responseProduct = savedProduct.toObject();
        if (responseProduct.saleEndsAt) {
            responseProduct.saleEndsAt = formatToDDMMYYYY(responseProduct.saleEndsAt);
        }
        res.status(201).json({ 
            message: "Product created.", 
            product: responseProduct, 
            slug: savedProduct.slug });
    } catch (error) {
        console.error("Create product error:", error);
        res.status(500).json({ message: "Failed to create a product", error: error.message });
    }
};

// UPDATE PRODUCT
export const updateProduct = async (req, res) => {
    try {
        const id = req.params.id;
        const product = await Product.findById(id);
        if (!product) return res.status(404).json({ message: "Product not found." });

        const updateData = req.body;

        if (req.files?.length) {
            for (const img of product.imageUrl) {
                await deleteFromCloudinary(img.public_id);
            }
            updateData.imageUrl = [];
            for (const file of req.files) {
                const result = await uploadToCloudinary(file);
                updateData.imageUrl.push({
                    url: result.secure_url,
                    public_id: result.public_id
                });
            }
        }

        if (updateData.title && updateData.title !== product.title) {
            let newSlug = slugify(updateData.title, { lower: true, strict: true });
            let suffix = 1;
            while (await Product.findOne({ slug: newSlug, _id: { $ne: id } })) {
                newSlug = `${slugify(updateData.title, { lower: true, strict: true })}-${suffix++}`;
            }
            updateData.slug = newSlug;
        }

        // Parse stringified fields
        if (typeof updateData.tags === "string") updateData.tags = updateData.tags.split(",").map(tag => tag.trim());
        if (typeof updateData.variants === "string") updateData.variants = JSON.parse(updateData.variants);
        if (typeof updateData.specs === "string") updateData.specs = JSON.parse(updateData.specs);
        if (typeof updateData.dimensions === "string") updateData.dimensions = JSON.parse(updateData.dimensions);

        if (updateData.variants?.length) {
            updateData.stock = updateData.variants.reduce((sum, v) => sum + (v.stock || 0), 0);
        }

        if (updateData.saleEndsAt) {
            const parsedDate = parseCustomDate(updateData.saleEndsAt);
            if (!parsedDate) return res.status(400).json({ message: "Invalid sale end date format. Use DD-MM-YYYY." });
            updateData.saleEndsAt = parsedDate;
        }

        const price = updateData.price ? Number(updateData.price) : product.price;
        const { finalSalePrice, discountPercent } = computeSale(price, updateData.salePrice, updateData.salePercent);

        updateData.salePrice = finalSalePrice;
        updateData.discountPercent = discountPercent;
        updateData.onSale = finalSalePrice && updateData.saleEndsAt && new Date(updateData.saleEndsAt) > new Date();

        const updatedProduct = await Product.findByIdAndUpdate(id, updateData, { new: true });
        if (!updatedProduct) return res.status(404).json({ message: "Product not found for update." });

        res.status(200).json({ message: "Product updated", product: updatedProduct });
    } catch (error) {
        res.status(500).json({ message: "Failed to update the product.", error: error.message });
    }
};

// DELETE PRODUCT
export const deleteProduct = async (req, res) => {
    try {
        const { id } = req.params;
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ message: "Invalid product id." });
        }

        const product = await Product.findById(id);
        if (!product) return res.status(404).json({ message: "Product not found." });

        for (const img of product.imageUrl) {
            await deleteFromCloudinary(img.public_id);
        }

        await Product.findByIdAndDelete(id);
        res.json({ message: "Deleted successfully" });
    } catch (error) {
        res.status(500).json({ message: "Failed to delete product.", error: error.message });
    }
};

// GET ALL PRODUCTS
export const getAllProducts = async (req, res) => {
    try {
        const { page = 1, limit = 10, category, search, onSale } = req.query;
        const query = {};

        if (category) query.category = category;
        if (search) query.title = new RegExp(search, "i");
        if (onSale === "true") query.onSale = true;

        const products = await Product.find(query)
            .skip((page - 1) * limit)
            .limit(parseInt(limit))
            .sort({ createdAt: -1 });

        const total = await Product.countDocuments(query);

        const enhancedProducts = products.map(p => {
            const isOnSale = p.onSale && p.saleEndsAt && new Date(p.saleEndsAt) > new Date();
            const discount = p.discountPercent;
            const formattedEndsAt = p.saleEndsAt ? formatToDDMMYYYY(p.saleEndsAt) : null;

            return {
                ...p.toObject(),
                saleInfo: isOnSale ? {
                    originalPrice: p.price,
                    salePrice: p.salePrice,
                    discountPercent: discount,
                    saleLabel: discount ? `${discount}% OFF` : null,
                    endsAt: formattedEndsAt
                } : null
            };
        });

        res.json({
            products: enhancedProducts,
            totalPages: Math.ceil(total / limit),
            currentPage: parseInt(page)
        });
    } catch (error) {
        res.status(500).json({ message: "Failed to fetch products.", error: error.message });
    }
};

// GET PRODUCT DETAILS
export const getProductDetails = async (req, res) => {
    try {
        const { id } = req.params;
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(404).json({ message: "Invalid product ID." });
        }

        const product = await Product.findById(id)
            .populate("createdBy", "name email")
            .populate("category", "name")
            .populate("brand", "name");

        if (!product) {
            return res.status(404).json({ message: "Product not found." });
        }

        const isOnSale = product.onSale && product.saleEndsAt && new Date(product.saleEndsAt) > new Date();

        const saleInfo = isOnSale ? {
            originalPrice: product.price,
            salePrice: product.salePrice,
            discountPercent: product.discountPercent,
            saleLabel: product.discountPercent ? `${product.discountPercent}% OFF` : null,
            endsAt: formatToDDMMYYYY(product.saleEndsAt)
        } : null;
        res.status(200).json({ product, saleInfo });
    } catch (error) {
        console.error("Get product details error:", error);
        res.status(500).json({ message: "Failed to fetch product details.", error: error.message });
    }
};
