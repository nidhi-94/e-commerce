import mongoose from "mongoose";
import Category from "../../models/categorymodel.js";
import { uploadToCloudinary, deleteFromCloudinary } from "../../utils/cloudinaryupload.js";
import slugify from "slugify";

const toBool = (val) => val === "true" ||val === true;
const allowedTypes = ["image/png", "image/svg+xml"];

export const createCategory = async (req, res) => {
    try {
        console.log("Creating category with data:", req.body);
        console.log("Uploaded file:", req.file);

        const { name, isFeatured, isActive, displayOrder } = req.body;

        if (!name?.trim()) {
            return res.status(400).json({ message: "Category name is required." });
        }

        if (!req.file) {
            return res.status(400).json({ message: "Icon image (PNG or SVG) is required." });
        }

        if (!allowedTypes.includes(req.file.mimetype)) {
            return res.status(400).json({ message: "Only PNG or SVG icons are allowed." });
        }

        const slug = slugify(name.trim().toLowerCase(), { lower: true, strict: true });

        const existingCategory = await Category.findOne({ slug });
        if (existingCategory) {
            return res.status(400).json({ message: "Category with this name already exists." });
        }

        const iconResult = await uploadToCloudinary(req.file);

        const maxCategory = await Category.findOne().sort("-displayOrder").select("displayOrder");
        const newDisplayOrder =  displayOrder?.trim() !== ""
            ? Number(displayOrder) || 0
            : maxCategory?.displayOrder + 1 || 1;

        const newCategory = new Category({
            name,
            slug,
            icon: {
                url: iconResult.secure_url,
                public_id: iconResult.public_id
            },
            isFeatured: toBool(isFeatured),
            isActive: isActive === "false" ? false : true,
            displayOrder: newDisplayOrder
        });

        await newCategory.save();
        res.status(201).json({ message: "Category created successfully.", newCategory });
    } catch (error) {
        console.error("Error creating category:", error.message);
        res.status(500).json({ message: "Failed to create category.", error: error.message });
    }
}

export const getAllCategories = async (req, res) => {
    try {
        console.log("Fetching all categories");
        const categories = await Category.find().sort({ displayOrder: 1, createdAt: -1 });
        res.json(categories);
    } catch (error) {
        console.error("Error creating category:", error.message);
        res.status(500).json({ message: "Failed to fetch categories", error: error.message });
    }
}

export const getCategoryById = async (req, res) => {
    try {
        const { categoryId } = req.params;

        const category = await Category.findById(categoryId);
        if(!category) {
            return res.status(404).json({ message: "Category not found." });
        }
        res.status(200).json(category);
    } catch (error) {
        console.log("Error fetching category:", error.message);
        res.status(500).json({ message: "Failed to fetch category", error: error.message });
    }
}

export const updateCategory = async (req, res) => {
    try {
        console.log("======== Update Category Request ========");
        console.log("Params (categoryId):", req.params.categoryId);
        console.log("Body Data:", req.body);
        console.log("Uploaded File:", req.file ? req.file.originalname : "No file uploaded");

        const { categoryId } = req.params;
        const { name, isFeatured, isActive, displayOrder } = req.body;

        const category = await Category.findById(categoryId);
        if (!category) {
            return res.status(400).json({ message: "category not found." });
        }
        if (name && name !== category.name) {
            const slug = slugify(name.trim().toLowerCase(), { lower: true, strict: true });
             console.log(`Checking for existing category with slug: ${slug}`);

            const existingCategory = await Category.findOne({
                slug,
                _id: { $ne: new mongoose.Types.ObjectId(categoryId) }
            });
            if (existingCategory) {
                return res.status(400).json({ message: "Category with this name already exists." });
            }

            category.name = name;
            category.slug = slug;
            console.log("Category name and slug updated:", name, slug);
        }

        if (typeof isFeatured !== "undefined") {category.isFeatured = toBool(isFeatured);
            console.log("isFeatured set to:", category.isFeatured);
        }
        if (typeof isActive !== "undefined"){ category.isActive = isActive === "false" ? false : true; 
            console.log("isActive set to:", category.isActive);
        }
        if (typeof displayOrder !== "undefined") {category.displayOrder = parseInt(displayOrder) || 0;
            console.log("displayOrder set to:", category.displayOrder);
        }

        if (req.file) {
            if(!allowedTypes.includes(req.file.mimetype)){
                return res.status(400).json({ message: "Only PNG or SVG icons are allowed." });
            }
            if (category.icon?.public_id) {
                console.log("New icon upload detected. Validating...");
                try {
                    console.log("Deleting old icon:", category.icon.public_id);
                    await deleteFromCloudinary(category.icon.public_id);
                } catch (error) {
                    console.warn("Error deleting old icon from Cloudinary:", error.message);
                }
            }

            console.log("uploading new icon to Cloudinary");
            const iconResult = await uploadToCloudinary(req.file);
            category.icon = {
                url: iconResult.secure_url,
                public_id: iconResult.public_id
            };
            console.log("New icon uploaded:", iconResult.secure_url);
        } else {
            console.log("No new icon uploaded, keeping existing icon.");
        }

        await category.save();
        res.status(200).json({ message: "Category updated successfully.", category });

    } catch (error) {
        console.log("Error updating category:", error.message);
        res.status(500).json({ message: "Failed to update category", error: error.message })
    }
}

export const deleteCategory = async (req, res) => {
    try {
        const { categoryId } = req.params;

        const category = await Category.findById(categoryId);
        if (!category) {
            return res.status(400).json({ message: "Category not found." });
        }

        if (category.icon?.public_id) {
            try {
                await deleteFromCloudinary(category.icon.public_id);
            } catch (error) {
                console.log("Error deleting icon from Cloudinary:", error.message);
            }
        }

        await Category.findByIdAndDelete(categoryId);
        res.status(200).json({ message: "Category deleted successfully." })
    } catch (error) {
        console.log("Error deleting category:", error.message);
        res.status(500).json({ message: "Failed to delete category", error: error.message });
    }
}