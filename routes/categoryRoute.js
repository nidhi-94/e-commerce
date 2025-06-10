import express from "express";
import { uploadSingleIcon, uploadOptionalIcon } from "../middleware/uploadmiddleware.js";
import { requireAdmin, requireAuth } from "../middleware/authmiddleware.js";
import { createCategory, getAllCategories, updateCategory, deleteCategory } from "../controllers/categoryController.js";

const router= express.Router();

router.post("/create", requireAuth, requireAdmin, uploadSingleIcon, createCategory);

router.get("/list", requireAuth, requireAdmin, getAllCategories);

router.put("/:categoryId", requireAuth, requireAdmin, uploadOptionalIcon, updateCategory);

router.delete("/:categoryId", requireAuth, requireAdmin, deleteCategory);

export default router;