import Category from "../models/categorymodel.js";
import { uploadToCloudinary, deleteFromCloudinary } from "../utils/cloudinaryupload.js";
import slugify from "slugify";

export const createCategory = async (req, res) => {
    try {
        console.log("Creating category with data:", req.body);
        console.log("Uploaded file:", req.file);

        const { name, isFeatured, isActive, displayOrder } = req.body;

        if (!name) {
            return res.status(400).json({ message: "Category name is required." });
        }

        if (!req.file) {
            return res.status(400).json({ message: "Icon image (PNG or SVG) is required." });
        }

        const iconResult = await uploadToCloudinary(req.file);
        const slug = slugify(name, { lower: true, strict: true });

        const existingCategory = await Category.findOne({ slug });
        if (existingCategory) {
            return res.status(400).json({ message: "Category with this name already exists." });
        }

        const category = new Category({
            name,
            slug,
            icon: {
                url: iconResult.secure_url,
                public_id: iconResult.public_id
            },
            isFeatured: isFeatured === "true" || isFeatured === true,
            isActive: isActive === "false" ? false : true,
            displayOrder: displayOrder ? parseInt(displayOrder) : 0
        });

        await category.save();
        res.status(201).json({ message: "Category created successfully.", category });
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

export const updateCategory = async (req, res) => {
    try {
        console.log("update category body:", req.body);
        console.log("update category file:", req.file);
        console.log("update category params:", req.params);

        const { categoryId } = req.params;
        const { name, isFeatured, isActive, displayOrder } = req.body;

        const category = await Category.findById(categoryId);
        if (!category) {
            return res.status(400).json({ message: "category not found." });
        }
        if (name && name !== category.name) {
            const slug = slugify(name, { lower: true, strict: true });

            const existingCategory = await Category.findOne({
                slug,
                _id: { $ne: categoryId }
            });
            if (existingCategory) {
                return res.status(400).json({ message: "Category with this name already exists." });
            }

            category.name = name;
            category.slug = slug;
        }
        
        if (typeof isFeatured !== "undefined") { category.isFeatured = isFeatured === "true" || isFeatured === true; }
        if (typeof isActive !== "undefined") { category.isActive = isActive === "false" ? false : true; }
        if (typeof displayOrder !== "undefined") { category.displayOrder = parseInt(displayOrder) || 0; }

        if (req.file) {
            console.log("Replacing icon for category:", categoryId);
            if (category.icon?.public_id) {
                try {
                    console.log("Deleting old icon:", category.icon.public_id);
                    await deleteFromCloudinary(category.icon.public_id);
                } catch (error) {
                    console.log("Error deleting old icon from Cloudinary:", error.message);
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