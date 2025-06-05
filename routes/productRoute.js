import express from "express";
import upload from "../middleware/uploadmiddleware.js";
import { createProduct, updateProduct, deleteProduct, getAllProducts, getProductDetails} from "../controllers/productController.js";
import { requireAuth, requireAdmin } from "../middleware/authmiddleware.js";

const router = express.Router();

router.post('/upload-image', requireAdmin, upload.single('image'), (req, res) => {
    res.json({
        message: "Image uploaded successfully.",
        url: req.file.path,
        imageUrl: req.file.path,
    })
});

router.post("/createProduct", requireAuth, requireAdmin, upload.array("image", 5), createProduct);

router.put("/updateProduct/:id", requireAuth, requireAdmin, upload.array("images", 5),  updateProduct);

router.delete("/deleteProduct/:id", requireAuth, requireAdmin, deleteProduct);    

router.get("/allProducts", getAllProducts);

router.get("/details/:id", getProductDetails);

export default router;