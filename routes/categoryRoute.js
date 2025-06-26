import express from "express";
import { uploadSingleIcon, uploadOptionalIcon } from "../middleware/uploadmiddleware.js";
import { requireAdmin, requireAuth } from "../middleware/authmiddleware.js";
import { createCategory, getAllCategories, updateCategory, getCategoryById, deleteCategory } from "../controllers/admin/categoryAdminController.js";
import { getFeaturedCategories } from "../controllers/user/categoryUserController.js";

const router= express.Router();

router.post("/create", requireAuth, requireAdmin, uploadSingleIcon, createCategory);

router.get("/list", requireAuth, requireAdmin, getAllCategories);

router.put("/update/:categoryId", requireAuth, requireAdmin, uploadOptionalIcon, updateCategory);

router.get("/getCategory/:categoryId", requireAuth, requireAdmin, getCategoryById);

router.delete("/delete/:categoryId", requireAuth, requireAdmin, deleteCategory);

router.get("/featured", getFeaturedCategories);

export default router;