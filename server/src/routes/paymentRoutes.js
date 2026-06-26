const express = require('express');
const {
  createCheckoutSession,
  createPaymentIntent,
  stripeWebhook,
  verifyPayment,
} = require('../controllers/paymentController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

// Webhook is mounted directly in server.js

router.post('/create-checkout-session', protect, createCheckoutSession);
router.post('/create-payment-intent', protect, createPaymentIntent);
router.get('/verify/:sessionId', protect, verifyPayment);

module.exports = router;
