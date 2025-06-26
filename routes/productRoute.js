import express from "express";
import upload from "../middleware/uploadmiddleware.js";
import {
    createProduct,
    updateProduct,
    deleteProduct,
    getAllProducts,
    getProductDetails,
} from "../controllers/admin/productAdminController.js";
import { requireAuth, requireAdmin } from "../middleware/authmiddleware.js";
import {
    filterProducts,
    getAllTags,
    getNewArrivals,
    getPopularProducts,
    getUserProductDetails,
    searchProducts
} from "../controllers/user/productUserController.js";

const router = express.Router();

router.post('/upload-image', requireAdmin, requireAuth, upload.single('image'), (req, res) => {
    res.json({
        message: "Image uploaded successfully.",
        url: req.file.path,
        imageUrl: req.file.path,
    })
});

router.post("/create", requireAuth, requireAdmin, upload.array("images", 5), createProduct);
router.put("/update/:id", requireAuth, requireAdmin, upload.array("images", 5), updateProduct);
router.delete("/delete/:id", requireAuth, requireAdmin, deleteProduct);
router.get("/allProducts", getAllProducts);
router.get("/popular", getPopularProducts);
router.get("/new-arrivals", getNewArrivals);
router.get("/tags", getAllTags);
router.get("/details/id/:id", getProductDetails);
router.get("/details/slug/:slug", getUserProductDetails);
router.get("/search", searchProducts);
router.get("/filter", filterProducts);

export default router;