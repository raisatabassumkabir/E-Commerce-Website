const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const mongoose = require('mongoose');
const Order = require('../models/Order');
const Product = require('../models/Product');
const asyncHandler = require('../utils/asyncHandler');
const AppError = require('../utils/AppError');

const decrementInventory = async (productId, quantity, session, size, color) => {
  const product = await Product.findById(productId).session(session);
  if (!product) return null;

  let variant = product.variants.find(
    (v) => v.color.toLowerCase() === (color || '').toLowerCase()
  );
  if (!variant) {
    variant = product.variants[0];
  }
  if (!variant) return null;

  const sizeObj = variant.sizes.find(
    (s) => s.size.toLowerCase() === (size || '').toLowerCase()
  );
  if (!sizeObj || sizeObj.inventoryCount < quantity) {
    return null;
  }

  sizeObj.inventoryCount -= quantity;
  await product.save({ session });
  return product;
};

// Helper to mark an existing pending order as Paid, decrement inventory, and update shipping details
const processOrderPaid = async ({ orderId, stripeSessionId, shipping }) => {
  if (!orderId || !mongoose.Types.ObjectId.isValid(orderId)) {
    throw new Error('Invalid Order ID');
  }

  const order = await Order.findById(orderId);
  if (!order) {
    console.error(`[WEBHOOK WARNING] Order ${orderId} not found in DB. Payment succeeded but no order exists.`);
    return null;
  }

  if (order.paymentStatus === 'Paid') {
    console.log(`ℹ️ Order ${orderId} is already marked as Paid.`);
    return order;
  }

  const mongoSession = await mongoose.startSession();
  mongoSession.startTransaction();

  try {
    // Decrement inventory for each item in the order
    for (const item of order.orderItems) {
      const updated = await decrementInventory(item.product, item.quantity, mongoSession, item.size, item.color);
      if (!updated) {
        console.warn(`⚠️ Oversell detected for product ${item.product} in order ${orderId}`);
      }
    }

    if (shipping && shipping.address) {
      order.shippingAddress = {
        fullName: shipping.name || order.shippingAddress?.fullName || 'Anonymous',
        street: shipping.address.line1 || order.shippingAddress?.street || '',
        city: shipping.address.city || order.shippingAddress?.city || '',
        state: shipping.address.state || order.shippingAddress?.state || '',
        postalCode: shipping.address.postal_code || order.shippingAddress?.postalCode || '',
        country: shipping.address.country || order.shippingAddress?.country || 'US',
      };
    }

    order.paymentStatus = 'Paid';
    order.orderStatus = 'Processing';
    order.stripeSessionId = stripeSessionId;
    order.paidAt = new Date();

    await order.save({ session: mongoSession });
    await mongoSession.commitTransaction();
    mongoSession.endSession();

    console.log(`✅ Order ${orderId} successfully marked as Paid.`);
    return order;
  } catch (err) {
    await mongoSession.abortTransaction();
    mongoSession.endSession();
    console.error(`❌ Webhook order confirmation failed for ${orderId}:`, err);
    throw err;
  }
};

// Helper to construct and save the order in MongoDB using a Mongoose Transaction
const processOrderCreation = async ({ userId, compactCartItems, shippingAddress, stripeSessionId, stripePaymentIntentId }) => {
  const mongoSession = await mongoose.startSession();
  mongoSession.startTransaction();

  try {
    let validUserId = null;
    if (userId && mongoose.Types.ObjectId.isValid(userId)) {
      validUserId = userId;
    }

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
      user: validUserId,
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

  const orderItems = [];
  let itemsPrice = 0;
  for (const item of cartItems) {
    const product = await Product.findById(item.product);
    if (!product || !product.isPublished) {
      return next(new AppError(`Product not found: ${item.title || item.name}`, 404));
    }
    
    let variant = product.variants.find(
      (v) => v.color.toLowerCase() === (item.color || '').toLowerCase()
    );
    if (!variant) {
      variant = product.variants[0];
    }
    const sizeObj = variant?.sizes?.find(
      (s) => s.size.toLowerCase() === (item.size || '').toLowerCase()
    );
    const stock = sizeObj ? sizeObj.inventoryCount : 0;
    if (stock < item.quantity) {
      return next(
        new AppError(
          `"${product.title}" (Size: ${item.size}${item.color ? `, Color: ${item.color}` : ''}) only has ${stock} unit(s) left.`,
          400
        )
      );
    }

    orderItems.push({
      product: product._id,
      title: product.title,
      image: product.images[0]?.url || '',
      price: product.price,
      quantity: item.quantity,
      size: item.size || 'N/A',
      color: item.color || 'N/A',
    });
    itemsPrice += product.price * item.quantity;
  }

  const finalShippingPrice = shippingPrice !== undefined ? Number(shippingPrice) : (itemsPrice > 100 ? 0 : 9.99);
  const tax = Number((itemsPrice * 0.08).toFixed(2));
  const totalPrice = Number((itemsPrice + finalShippingPrice + tax).toFixed(2));
  const totalAmount = Math.round(totalPrice * 100);

  const bodyUserId = req.body.userId;
  const finalUserId = (bodyUserId && mongoose.Types.ObjectId.isValid(bodyUserId))
    ? bodyUserId
    : (req.user?._id ? req.user._id.toString() : null);

  // 1. Aggressively wipe out any stale/ghost pending orders for this user to avoid any duplicate listings
  if (finalUserId) {
    await Order.deleteMany({
      user: finalUserId,
      paymentStatus: 'Pending',
    });
  }

  // 2. Create the single, fresh Pending order
  const order = await Order.create({
    user: finalUserId,
    orderItems,
    shippingAddress: {
      fullName: req.user?.name || 'Guest Checkout',
      street: 'Pending',
      city: 'Pending',
      state: 'Pending',
      postalCode: 'Pending',
      country: 'US',
    },
    itemsPrice,
    shippingPrice: finalShippingPrice,
    taxPrice: tax,
    totalPrice,
    paymentMethod: 'Card',
    paymentStatus: 'Pending',
    orderStatus: 'Pending',
  });

  // GUARD CLAUSE: Do not proceed to Stripe if DB creation failed
  if (!order || !order._id) {
    return next(new AppError("Database failed to generate Pending Order.", 500));
  }

  // 2. Create Stripe Intent with ONLY the Order ID
  const paymentIntent = await stripe.paymentIntents.create({
    amount: totalAmount,
    currency: 'usd',
    automatic_payment_methods: { enabled: true },
    metadata: {
      orderId: order._id.toString(),
    },
  });

  res.status(200).json({
    clientSecret: paymentIntent.client_secret,
    orderId: order._id.toString(),
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
const emitNewOrderEvent = async (req, order) => {
  try {
    const io = req.app.get('io');
    if (io && order) {
      const populatedOrder = await Order.findById(order._id).populate('user', 'name');
      if (populatedOrder) {
        io.to('admin-alerts').emit('new-order', {
          title: 'New Order Received!',
          message: `${populatedOrder.user?.name || 'A customer'} just placed an order for $${populatedOrder.totalPrice}`,
          orderId: populatedOrder._id
        });
      }
    }
  } catch (err) {
    console.error('Socket emit error:', err);
  }
};

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
      try {
        const metadata = stripeSession.metadata || {};
        const orderId = metadata.orderId;
        const userId = metadata.userId;

        if (orderId && mongoose.Types.ObjectId.isValid(orderId)) {
          const order = await processOrderPaid({
            orderId,
            stripeSessionId: stripeSession.id,
            shipping: stripeSession.shipping_details || stripeSession.shipping,
          });
          if (!order) {
            return res.status(200).json({ received: true, warning: 'Order not found' });
          }
          await emitNewOrderEvent(req, order);
        } else {
          // Legacy webhook fallback
          const compactCartItems = JSON.parse(metadata.cartItems || '[]');
          const shippingAddress = JSON.parse(metadata.shippingAddress || '{}');

          // Make sure we don't duplicate processing
          const existingOrder = await Order.findOne({ stripeSessionId: stripeSession.id });
          if (existingOrder) {
            return res.status(200).json({ received: true });
          }

          const createdOrder = await processOrderCreation({
            userId,
            compactCartItems,
            shippingAddress,
            stripeSessionId: stripeSession.id
          });
          await emitNewOrderEvent(req, createdOrder);
        }
      } catch (error) {
        console.error('❌ CRITICAL WEBHOOK DB ERROR (checkout.session.completed):', error.message, error);
      }
    }

    if (event.type === 'payment_intent.succeeded') {
      const paymentIntent = event.data.object;
      
      try {
        const metadata = paymentIntent.metadata || {};
        const orderId = metadata.orderId;

        if (orderId && mongoose.Types.ObjectId.isValid(orderId)) {
          const order = await processOrderPaid({
            orderId,
            stripeSessionId: paymentIntent.id,
            shipping: paymentIntent.shipping,
          });
          if (!order) {
            return res.status(200).json({ received: true, warning: 'Order not found' });
          }
          await emitNewOrderEvent(req, order);
        } else {
          // Legacy webhook fallback if cartItems are still in metadata
          if (metadata.cartItems) {
            const { userId, cartItems } = metadata;
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

            const createdOrder = await processOrderCreation({
              userId,
              compactCartItems,
              shippingAddress,
              stripePaymentIntentId: paymentIntent.id
            });
            await emitNewOrderEvent(req, createdOrder);
          }
        }
      } catch (error) {
        console.error('❌ CRITICAL WEBHOOK DB ERROR (payment_intent.succeeded):', error.message, error);
      }
    } else {
      console.log(`Unhandled event type: ${event.type}`);
    }

    res.status(200).json({ received: true });
  } catch (err) {
    console.error('❌ STRIPE WEBHOOK UNCAUGHT ERROR:', err.message, err);
    // Stripe will retry if we send a 500
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

// ── GET /api/payment/verify/:sessionId ────────────────────────────────────────
const verifyPayment = asyncHandler(async (req, res, next) => {
  const { sessionId } = req.params;

  // First, try to locate the order by stripeSessionId or by order _id itself
  let order = await Order.findOne({
    $or: [
      { stripeSessionId: sessionId },
      { _id: mongoose.Types.ObjectId.isValid(sessionId) ? sessionId : null }
    ]
  });

  // If not found, retrieve the PaymentIntent/CheckoutSession from Stripe to find the orderId
  if (!order) {
    try {
      if (sessionId.startsWith('pi_')) {
        const paymentIntent = await stripe.paymentIntents.retrieve(sessionId);
        const orderId = paymentIntent.metadata?.orderId;
        if (orderId) {
          order = await Order.findById(orderId);
          // If Stripe confirms it succeeded, mark the pending order as paid on the fly
          if (paymentIntent.status === 'succeeded' && order && order.paymentStatus === 'Pending') {
            order = await processOrderPaid({
              orderId,
              stripeSessionId: paymentIntent.id,
              shipping: paymentIntent.shipping,
            });
          }
        }
      } else if (sessionId.startsWith('cs_')) {
        const checkoutSession = await stripe.checkout.sessions.retrieve(sessionId);
        const orderId = checkoutSession.metadata?.orderId;
        if (orderId) {
          order = await Order.findById(orderId);
          if (checkoutSession.payment_status === 'paid' && order && order.paymentStatus === 'Pending') {
            order = await processOrderPaid({
              orderId,
              stripeSessionId: checkoutSession.id,
              shipping: checkoutSession.shipping_details || checkoutSession.shipping,
            });
          }
        }
      }
    } catch (stripeErr) {
      console.error('Stripe retrieval failed during payment verification:', stripeErr);
    }
  } else {
    // If order was found but status is still Pending, let's verify with Stripe to be sure
    if (order.paymentStatus === 'Pending') {
      try {
        if (sessionId.startsWith('pi_')) {
          const paymentIntent = await stripe.paymentIntents.retrieve(sessionId);
          if (paymentIntent.status === 'succeeded') {
            order = await processOrderPaid({
              orderId: order._id.toString(),
              stripeSessionId: paymentIntent.id,
              shipping: paymentIntent.shipping,
            });
          }
        } else if (sessionId.startsWith('cs_')) {
          const checkoutSession = await stripe.checkout.sessions.retrieve(sessionId);
          if (checkoutSession.payment_status === 'paid') {
            order = await processOrderPaid({
              orderId: order._id.toString(),
              stripeSessionId: checkoutSession.id,
              shipping: checkoutSession.shipping_details || checkoutSession.shipping,
            });
          }
        }
      } catch (stripeErr) {
        console.error('Stripe check failed for pending order:', stripeErr);
      }
    }
  }

  if (!order) return next(new AppError('Order not found.', 404));

  // Populate product details for the frontend success page view
  order = await Order.findById(order._id).populate(
    'orderItems.product',
    'title images'
  );

  res.status(200).json({ success: true, order });
});

module.exports = {
  createCheckoutSession,
  createPaymentIntent,
  stripeWebhook,
  verifyPayment,
};
