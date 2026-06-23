const stripe = require('../config/stripe');
const mongoose = require('mongoose');
const Order = require('../models/Order');
const Product = require('../models/Product');
const asyncHandler = require('../utils/asyncHandler');
const AppError = require('../utils/AppError');

// ── Atomic inventory helpers ─────────────────────────────────────────────────
const decrementInventory = async (productId, quantity, session) =>
  Product.findOneAndUpdate(
    { _id: productId, inventoryCount: { $gte: quantity } },
    { $inc: { inventoryCount: -quantity } },
    { new: true, session }
  );

const restoreInventory = async (productId, quantity, session) =>
  Product.findByIdAndUpdate(
    productId,
    { $inc: { inventoryCount: +quantity } },
    { new: true, session }
  );

// ── POST /api/payment/create-checkout-session ──────────────────────────────────
const createCheckoutSession = asyncHandler(async (req, res, next) => {
  const { cartItems, shippingAddress } = req.body;

  if (!cartItems || cartItems.length === 0) {
    return next(new AppError('Cart is empty.', 400));
  }

  // ── Server-side product verification ────────────────────────────────────────
  const verifiedItems = [];
  for (const item of cartItems) {
    const product = await Product.findById(item.product);
    if (!product || !product.isPublished) {
      return next(new AppError(`Product not found: ${item.product}`, 404));
    }
    if (product.inventoryCount < item.quantity) {
      return next(
        new AppError(
          `"${product.title}" only has ${product.inventoryCount} unit(s) left. Please reduce quantity.`,
          400
        )
      );
    }
    verifiedItems.push({
      product: product._id,
      title: product.title,
      image: product.images[0]?.url || '',
      price: product.price, // server-side price always
      quantity: item.quantity,
      size: item.size,
      color: item.color || '',
    });
  }

  // ── Calculate totals ─────────────────────────────────────────────────────────
  const itemsPrice = verifiedItems.reduce((acc, i) => acc + i.price * i.quantity, 0);
  const shippingPrice = itemsPrice > 100 ? 0 : 9.99;
  const taxPrice = Number((0.08 * itemsPrice).toFixed(2));
  const totalPrice = Number((itemsPrice + shippingPrice + taxPrice).toFixed(2));

  // ── Create a PENDING order (inventory decremented only on webhook confirmation) ─
  const order = await Order.create({
    user: req.user._id,
    orderItems: verifiedItems,
    shippingAddress,
    itemsPrice,
    shippingPrice,
    taxPrice,
    totalPrice,
    paymentStatus: 'Pending',
    deliveryStatus: 'Processing',
  });

  // ── Build Stripe line items ─────────────────────────────────────────────────
  const lineItems = verifiedItems.map((item) => ({
    price_data: {
      currency: 'usd',
      product_data: {
        name: `${item.title} (Size: ${item.size})`,
        images: [item.image].filter(Boolean),
      },
      unit_amount: Math.round(item.price * 100),
    },
    quantity: item.quantity,
  }));

  if (shippingPrice > 0) {
    lineItems.push({
      price_data: {
        currency: 'usd',
        product_data: { name: 'Standard Shipping' },
        unit_amount: Math.round(shippingPrice * 100),
      },
      quantity: 1,
    });
  }

  // ── Create Stripe Checkout Session ──────────────────────────────────────────
  const session = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    line_items: lineItems,
    mode: 'payment',
    success_url: `${process.env.CLIENT_URL}/payment-success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${process.env.CLIENT_URL}/cart`,
    metadata: {
      orderId: order._id.toString(),
      userId: req.user._id.toString(),
    },
    customer_email: req.user.email,
  });

  order.stripeSessionId = session.id;
  await order.save();

  res.status(200).json({ success: true, url: session.url });
});

// ── POST /api/payment/webhook ──────────────────────────────────────────────────
// Raw body MUST be used here — configured in server.js BEFORE express.json()
const stripeWebhook = async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error(`⚠️  Webhook verification failed: ${err.message}`);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // ── Payment succeeded: decrement inventory atomically ───────────────────────
  if (event.type === 'checkout.session.completed') {
    const stripeSession = event.data.object;
    const order = await Order.findOne({ stripeSessionId: stripeSession.id });

    if (order && order.paymentStatus !== 'Paid') {
      const mongoSession = await mongoose.startSession();
      mongoSession.startTransaction();

      try {
        const inventoryFailures = [];

        for (const item of order.orderItems) {
          const updated = await decrementInventory(item.product, item.quantity, mongoSession);
          if (!updated) {
            inventoryFailures.push({ product: item.product, quantity: item.quantity });
          }
        }

        if (inventoryFailures.length > 0) {
          // Extremely rare: item sold out between session creation and webhook
          // Mark as paid but flag for manual review
          console.warn(`⚠️  Oversell detected for order ${order._id}. Manual review needed.`);
          order.deliveryStatus = 'Processing'; // Admin will resolve manually
        }

        order.paymentStatus = 'Paid';
        order.paidAt = new Date();
        await order.save({ session: mongoSession });

        await mongoSession.commitTransaction();
        mongoSession.endSession();

        console.log(`✅  Order ${order._id} confirmed via Stripe webhook.`);
      } catch (err) {
        await mongoSession.abortTransaction();
        mongoSession.endSession();
        console.error(`❌  Webhook inventory update failed for order ${order._id}:`, err);
      }
    }
  }

  // ── Session expired (user abandoned checkout): restore order to Failed ───────
  if (event.type === 'checkout.session.expired') {
    const stripeSession = event.data.object;
    const order = await Order.findOne({ stripeSessionId: stripeSession.id });
    if (order && order.paymentStatus === 'Pending') {
      order.paymentStatus = 'Failed';
      await order.save();
      console.log(`⚠️  Order ${order._id} expired — marked Failed.`);
    }
  }

  res.status(200).json({ received: true });
};

// ── GET /api/payment/verify/:sessionId ────────────────────────────────────────
const verifyPayment = asyncHandler(async (req, res, next) => {
  const { sessionId } = req.params;
  const order = await Order.findOne({ stripeSessionId: sessionId }).populate(
    'orderItems.product',
    'title images'
  );
  if (!order) return next(new AppError('Order not found.', 404));
  res.status(200).json({ success: true, order });
});

module.exports = { createCheckoutSession, stripeWebhook, verifyPayment };
