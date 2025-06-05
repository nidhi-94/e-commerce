import Category from "../models/categorymodel.js";
import { uploadToCloudinary } from "../utils/cloudinaryupload.js";

export const createCategory = async (req, res) => {
    try {
        const { name, saleStart, salePercentage } = req.body;

        if(!req.file){
            return res.status(400).json({message: "Icon image is required."});
        }

        const iconResult = await uploadToCloudinary(req.file);

        let percentage = salePercentage;
        if(typeof salePercentage === "string" && salePercentage.includes("%")){
            percentage = parseFloat(salePercentage.replace("%",""));
        }

        const category = new Category({
            name,
            icon: {
                url: iconResult.secure_url,
                public_id: iconResult.public_id
            },
            saleStart,
            salePercentage: percentage
        });

        await category.save();
        res.status(201).json({message: "Category created.", category});
    } catch (error) {
        res.status(500).json({message: "Failed to create category.", error: error.message});
    }
}

export const getAllCategories = async (req, res) => {
    try {
        const categories = await Category.find().sort({ createdAt: -1});
        res.json(categories);
    } catch (error) {
        res.status(500).json({message: "Failed to fetch categories", error: error.message});
    }
}