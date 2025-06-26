import Category from "../../models/categorymodel.js";

export const getFeaturedCategories = async ( req, res ) => {
    try {
        const featured = await Category.find({ isFeatured: true, isActive: true })
            .sort({ displayOrder: 1, createdAt: -1 })
            .select("name slug icon displayOrder");

            res.status(200).json(featured);
    } catch (error) {
        console.log("Error fetching featured categories:", error.message);
        res.status(500).json({ message: "Failed to fetch featured categories", error: error.message });       
    }
}