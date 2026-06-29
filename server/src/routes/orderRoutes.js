const express = require('express');
const {
  createOrder,
  cancelOrder,
  getMyOrders,
  getOrderById,
  getAllOrders,
  updateOrderFulfillment,
  getOrderStats,
} = require('../controllers/orderController');
const { protect, adminOnly } = require('../middleware/authMiddleware');

const router = express.Router();

// ── User routes ───────────────────────────────────────────────────────────────
router.post('/', protect, createOrder);
router.get('/myorders', protect, getMyOrders);
router.get('/:id', protect, getOrderById);
router.put('/:id/cancel', protect, cancelOrder); // User OR Admin can cancel

// ── Admin routes ──────────────────────────────────────────────────────────────
router.get('/admin/stats', protect, adminOnly, getOrderStats);
router.get('/', protect, adminOnly, getAllOrders);
router.put('/:id/fulfillment', protect, adminOnly, updateOrderFulfillment);

module.exports = router;
