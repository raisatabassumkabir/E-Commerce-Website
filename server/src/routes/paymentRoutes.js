const express = require('express');
const {
  createCheckoutSession,
  stripeWebhook,
  verifyPayment,
} = require('../controllers/paymentController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

// Webhook uses raw body — mounted BEFORE express.json() in server.js
router.post('/webhook', stripeWebhook);

router.post('/create-checkout-session', protect, createCheckoutSession);
router.get('/verify/:sessionId', protect, verifyPayment);

module.exports = router;
