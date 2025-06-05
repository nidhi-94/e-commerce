import express from "express";
import upload from "../middleware/uploadmiddleware.js";
import { requireAdmin, requireAuth } from "../middleware/authmiddleware.js";
import { createCategory, getAllCategories } from "../controllers/categoryController.js";

const router= express.Router();

router.post("/create", requireAuth, requireAdmin, upload.single("icon"), createCategory);

router.get("/list", requireAuth, requireAdmin, getAllCategories);

router.post("/create", (req, res, next) => {
    console.log("Category create route hit");
    next();
}, requireAuth, requireAdmin, upload.single("icon"), createCategory);


export default router;