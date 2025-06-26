import express from "express";
import { getOrderList, getOrderDetails, updateOrderStatus, getStatusDistribution, exportOrdersCSV } from "../controllers/admin/orderAdminController.js";
import { requireAuth, requireAdmin, requireUser } from "../middleware/authmiddleware.js";
import { validateOrderInput } from "../middleware/validateOrderInput.js";
import { calculateOrderTotal,cancelOrder, checkoutFromCart, getMyOrders, reOrder, trackOrderStatus } from "../controllers/user/orderUserController.js";

const router = express.Router();

router.post("/total", requireAuth , calculateOrderTotal);
router.post("/checkout", requireAuth, requireUser, validateOrderInput, checkoutFromCart);
router.get("/my-orders", requireAuth, requireUser, getMyOrders);
router.post("/reorder/:orderId", requireAuth, requireUser, reOrder);
router.post("/track/:orderId", requireAuth, requireUser, trackOrderStatus);
router.post("/cancel/:orderId", requireAuth, requireUser, cancelOrder);

router.get("/admin/list", requireAuth, requireAdmin, getOrderList);
router.get("/export", requireAuth, requireAdmin, exportOrdersCSV);
router.get("/admin/:id", requireAuth, requireAdmin, getOrderDetails);
router.get("/admin/status-distribution", requireAuth, requireAdmin, getStatusDistribution);
router.patch("/admin/:id/status", requireAuth, requireAdmin, updateOrderStatus);

export default router;