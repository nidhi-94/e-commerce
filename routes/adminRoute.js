import express from "express";
import { requireAuth, requireAdmin } from "../middleware/authmiddleware.js";
import { getAdminOverview, getAllUsers } from "../controllers/admin/adminController.js";


const router = express.Router();

router.get("/users", requireAuth, requireAdmin, getAllUsers);
router.get("/overview", requireAuth, requireAdmin, getAdminOverview);
router.get("/stats", requireAuth, requireAdmin, getAdminOverview);

export default router;