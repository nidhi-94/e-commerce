import express from "express";
import { getOrderList, getOrderDetails, updateOrderStatus, getStatusDistribution, exportOrdersCSV, previewInvoice } from "../controllers/admin/orderAdminController.js";
import { requireAuth, requireAdmin, requireUser } from "../middleware/authmiddleware.js";
import { validateOrderInput } from "../middleware/validateOrderInput.js";
import { calculateOrderTotal, cancelOrderWithOtp, checkoutFromCart, getMyOrders, reOrder, sendCancelOtp, trackOrderStatus, userPreviewInvoice } from "../controllers/user/orderUserController.js";

const router = express.Router();

router.post("/total", requireAuth , calculateOrderTotal);
router.post("/checkout", requireAuth, requireUser, validateOrderInput, checkoutFromCart);
router.get("/my-orders", requireAuth, requireUser, getMyOrders);
router.post("/reorder/:orderId", requireAuth, requireUser, reOrder);
router.post("/track/:orderId", requireAuth, requireUser, trackOrderStatus);
router.get("/invoice/:orderId", requireAuth, requireUser, userPreviewInvoice);
router.post("/:id/send-otp", requireAuth, requireUser, sendCancelOtp);
router.post("/:id/cancel-with-otp", requireAuth, requireUser, cancelOrderWithOtp);

router.get("/admin/list", requireAuth, requireAdmin, getOrderList);
router.get("/export", requireAuth, requireAdmin, exportOrdersCSV);
router.get("/admin/status-distribution", requireAuth, requireAdmin, getStatusDistribution);
router.get("/admin/:id", requireAuth, requireAdmin, getOrderDetails);
router.patch("/admin/:id/status", requireAuth, requireAdmin, updateOrderStatus);
router.get("/invoice-preview/:orderId", requireAuth, previewInvoice);

export default router;