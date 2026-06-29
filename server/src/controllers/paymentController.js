const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
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

// Helper to construct and save the order in MongoDB using a Mongoose Transaction
const processOrderCreation = async ({ userId, compactCartItems, shippingAddress, stripeSessionId, stripePaymentIntentId }) => {
  const mongoSession = await mongoose.startSession();
  mongoSession.startTransaction();

  try {
    const orderItems = [];
    let itemsPrice = 0;
    const inventoryFailures = [];

    for (const item of compactCartItems) {
      const product = await Product.findById(item.p).session(mongoSession);
      if (product) {
        orderItems.push({
          product: product._id,
          title: product.title,
          image: product.images[0]?.url || '',
          price: product.price,
          quantity: item.q,
          size: item.s,
          color: item.c || '',
        });
        itemsPrice += product.price * item.q;

        const updated = await decrementInventory(item.p, item.q, mongoSession);
        if (!updated) {
          inventoryFailures.push({ product: item.p, quantity: item.q });
        }
      }
    }

    const shippingPrice = itemsPrice > 100 ? 0 : 9.99;
    const taxPrice = Number((0.08 * itemsPrice).toFixed(2));
    const totalPrice = Number((itemsPrice + shippingPrice + taxPrice).toFixed(2));

    let orderStatus = 'Processing';
    if (inventoryFailures.length > 0) {
      console.warn(`⚠️ Oversell detected for Stripe transaction.`);
    }

    const order = new Order({
      user: userId,
      orderItems,
      shippingAddress,
      itemsPrice,
      shippingPrice,
      taxPrice,
      totalPrice,
      paymentMethod: stripePaymentIntentId ? 'Card' : 'Stripe',
      paymentStatus: 'Paid',
      orderStatus,
      stripeSessionId: stripeSessionId || stripePaymentIntentId,
      paidAt: new Date()
    });

    await order.save({ session: mongoSession });
    await mongoSession.commitTransaction();
    mongoSession.endSession();

    console.log(`✅  Order ${order._id} created via Stripe webhook.`);
    return order;
  } catch (err) {
    await mongoSession.abortTransaction();
    mongoSession.endSession();
    console.error(`❌  Webhook order creation failed:`, err);
    throw err;
  }
};

// ── POST /api/payment/create-payment-intent ──────────────────────────────────
const createPaymentIntent = asyncHandler(async (req, res, next) => {
  if (!process.env.STRIPE_SECRET_KEY || process.env.STRIPE_SECRET_KEY.includes('***')) {
    return res.status(500).json({ message: "Stripe configuration error: Secret key is missing or invalid." });
  }

  const { cartItems, shippingPrice } = req.body;

  // Strict Payload Validation
  if (!Array.isArray(cartItems) || cartItems.length === 0) {
    return next(new AppError('Cart must be a non-empty array.', 400));
  }

  for (const item of cartItems) {
    if (item.price === undefined || !item.quantity || (!item.name && !item.title)) {
      return next(new AppError('Each cart item must have a price, quantity, and name/title.', 400));
    }
  }

  const verifiedItems = [];
  const compactCartItems = [];
  for (const item of cartItems) {
    const product = await Product.findById(item.product);
    if (!product || !product.isPublished) {
      return next(new AppError(`Product not found: ${item.title || item.name}`, 404));
    }
    if (product.inventoryCount < item.quantity) {
      return next(new AppError(`"${product.title}" only has ${product.inventoryCount} unit(s) left.`, 400));
    }
    verifiedItems.push({
      price: product.price,
      quantity: item.quantity,
    });
    
    compactCartItems.push({
      p: product._id.toString(),
      q: item.quantity,
      s: item.size || '',
      c: item.color || ''
    });
  }

  const itemsPrice = verifiedItems.reduce((acc, i) => acc + i.price * i.quantity, 0);
  const finalShippingPrice = shippingPrice !== undefined ? Number(shippingPrice) : (itemsPrice > 100 ? 0 : 9.99);
  const tax = Number((itemsPrice * 0.08).toFixed(2));
  
  // Total in cents
  const totalAmount = Math.round((itemsPrice + finalShippingPrice + tax) * 100);

  const paymentIntent = await stripe.paymentIntents.create({
    amount: totalAmount,
    currency: 'usd',
    automatic_payment_methods: { enabled: true },
    metadata: {
      userId: req.user._id.toString(),
      cartItems: JSON.stringify(compactCartItems).substring(0, 500),
    },
  });

  res.status(200).json({
    clientSecret: paymentIntent.client_secret,
  });
});

// ── POST /api/payment/create-checkout-session ──────────────────────────────────
const createCheckoutSession = asyncHandler(async (req, res, next) => {
  if (!process.env.STRIPE_SECRET_KEY || process.env.STRIPE_SECRET_KEY.includes('***')) {
    return res.status(500).json({ message: "Stripe configuration error: Secret key is missing or invalid." });
  }

  const { cartItems, shippingAddress } = req.body;

  // Strict Payload Validation
  if (!Array.isArray(cartItems) || cartItems.length === 0) {
    return next(new AppError('Cart must be a non-empty array.', 400));
  }

  for (const item of cartItems) {
    if (item.price === undefined || !item.quantity || (!item.name && !item.title)) {
      return next(new AppError('Each cart item must have a price, quantity, and name/title.', 400));
    }
  }

  // ── Server-side product verification ────────────────────────────────────────
  const verifiedItems = [];
  const compactCartItems = [];

  for (const item of cartItems) {
    const product = await Product.findById(item.product);
    if (!product || !product.isPublished) {
      return next(new AppError(`Product not found: ${item.title || item.name}`, 404));
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

    compactCartItems.push({
      p: product._id.toString(),
      q: item.quantity,
      s: item.size,
      c: item.color || ''
    });
  }

  const itemsPrice = verifiedItems.reduce((acc, i) => acc + i.price * i.quantity, 0);
  const shippingPrice = itemsPrice > 100 ? 0 : 9.99;

  // ── Build Stripe line items ─────────────────────────────────────────────────
  const lineItems = verifiedItems.map((item) => {
    // Stripe requires valid HTTP/HTTPS URLs. It often rejects localhost or relative paths.
    const isValidStripeImage = item.image && item.image.startsWith('http') && !item.image.includes('localhost');
    
    return {
      price_data: {
        currency: 'usd',
        product_data: {
          name: `${item.title} (Size: ${item.size})`,
          images: isValidStripeImage ? [item.image] : [],
        },
        unit_amount: Math.round(item.price * 100),
      },
      quantity: item.quantity,
    };
  });

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
      userId: req.user._id.toString(),
      cartItems: JSON.stringify(compactCartItems).substring(0, 500),
      shippingAddress: JSON.stringify(shippingAddress).substring(0, 500)
    },
    customer_email: req.user.email,
  });

  res.status(200).json({ success: true, id: session.id, url: session.url });
});

// ── POST /api/webhook/stripe ──────────────────────────────────────────────────
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

  try {
    if (event.type === 'checkout.session.completed') {
      const stripeSession = event.data.object;
      const metadata = stripeSession.metadata;
      const userId = metadata.userId;
      const compactCartItems = JSON.parse(metadata.cartItems || '[]');
      const shippingAddress = JSON.parse(metadata.shippingAddress || '{}');

      // Make sure we don't duplicate processing
      const existingOrder = await Order.findOne({ stripeSessionId: stripeSession.id });
      if (existingOrder) {
        return res.status(200).json({ received: true });
      }

      await processOrderCreation({
        userId,
        compactCartItems,
        shippingAddress,
        stripeSessionId: stripeSession.id
      });
    }

    if (event.type === 'payment_intent.succeeded') {
      const paymentIntent = event.data.object;
      
      // Handle custom PaymentIntent metadata
      if (paymentIntent.metadata && paymentIntent.metadata.cartItems) {
        const { userId, cartItems } = paymentIntent.metadata;
        const compactCartItems = JSON.parse(cartItems || '[]');

        const existingOrder = await Order.findOne({ stripeSessionId: paymentIntent.id });
        if (existingOrder) {
          return res.status(200).json({ received: true });
        }

        const shipping = paymentIntent.shipping || {};
        const shippingAddress = {
          fullName: shipping.name || 'Anonymous',
          street: shipping.address?.line1 || '',
          city: shipping.address?.city || '',
          state: shipping.address?.state || '',
          postalCode: shipping.address?.postal_code || '',
          country: shipping.address?.country || 'US',
        };

        await processOrderCreation({
          userId,
          compactCartItems,
          shippingAddress,
          stripePaymentIntentId: paymentIntent.id
        });
      }
    }

    res.status(200).json({ received: true });
  } catch (err) {
    // Stripe will retry if we send a 500
    res.status(500).json({ error: 'Internal Server Error' });
  }
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

module.exports = {
  createCheckoutSession,
  createPaymentIntent,
  stripeWebhook,
  verifyPayment,
};
