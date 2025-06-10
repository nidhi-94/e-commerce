import express from "express";
import { createOrder, getOrderList, getOrderDetails, updateOrderStatus, getStatusDistribution } from "../controllers/orderController.js";
import { requireAuth, requireAdmin } from "../middleware/authmiddleware.js";

const router = express.Router();

router.post("/createOrder", requireAuth, createOrder);

router.get("/admin/list", requireAuth, requireAdmin, getOrderList);

router.get("/admin/:orderId", requireAuth, requireAdmin, getOrderDetails);

router.get("/admin/status-distribution", requireAuth, requireAdmin, getStatusDistribution);

router.patch("/admin/:orderId/status", requireAuth, requireAdmin, updateOrderStatus);

export default router;