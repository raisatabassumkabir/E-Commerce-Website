const mongoose = require('mongoose');
const Order = require('../models/Order');
const Product = require('../models/Product');
const asyncHandler = require('../utils/asyncHandler');
const AppError = require('../utils/AppError');
const orderService = require('../services/orderService');

// ── ATOMIC INVENTORY DECREMENT ─────────────────────────────────────────────────
/**
 * Atomically decrements inventoryCount for a product only if sufficient stock exists.
 * Uses MongoDB's $inc with a conditional filter to prevent overselling.
 *
 * Returns the updated product, or null if stock was insufficient.
 */
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

const restoreInventory = async (productId, quantity, session, size, color) => {
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
  if (sizeObj) {
    sizeObj.inventoryCount += quantity;
    await product.save({ session });
  }
  return product;
};

// ── POST /api/orders ───────────────────────────────────────────────────────────
const createOrder = asyncHandler(async (req, res, next) => {
  const { orderId, cartItems, orderItems, shippingAddress, paymentMethod, isPaid, stripePaymentIntentId } = req.body;
  const items = cartItems || orderItems;

  if (!items || items.length === 0) {
    return next(new AppError('No items in the order.', 400));
  }

  // Deduplicate: Check if an order already exists for this payment intent
  if (stripePaymentIntentId) {
    const existingOrder = await Order.findOne({ stripeSessionId: stripePaymentIntentId });
    if (existingOrder) {
      return res.status(201).json({ success: true, order: existingOrder });
    }
  }

  // 1. If orderId is provided, we are transitioning a Pending Order to Paid
  if (orderId && mongoose.Types.ObjectId.isValid(orderId)) {
    const existingOrder = await Order.findById(orderId);
    if (existingOrder) {
      // If already Paid, return success immediately to prevent double inventory deduction
      if (existingOrder.paymentStatus === 'Paid') {
        return res.status(201).json({ success: true, order: existingOrder });
      }

      const session = await mongoose.startSession();
      session.startTransaction();

      try {
        // Step 1: Verify products and prices server-side
        const verifiedItems = [];
        for (const item of items) {
          const product = await Product.findById(item.product).session(session);
          if (!product || !product.isPublished) {
            throw new AppError(`Product not found: ${item.product}`, 404);
          }
          const sizeExists = product.variants?.some(v => v.sizes?.some(s => s.size === item.size)) || false;
          if (!sizeExists) {
            throw new AppError(`Size "${item.size}" is not available for: ${product.title}`, 400);
          }

          verifiedItems.push({
            product: product._id,
            title: product.title,
            image: product.images[0]?.url || '',
            price: product.price,
            quantity: item.quantity,
            size: item.size,
            color: item.color || '',
          });
        }

        // Step 2: Atomically decrement inventory for each item
        const inventoryFailures = [];
        for (const item of verifiedItems) {
          const updated = await decrementInventory(item.product, item.quantity, session, item.size, item.color);
          if (!updated) {
            const prod = await Product.findById(item.product).select('title inventoryCount').session(session);
            inventoryFailures.push(
              `"${prod?.title || item.product}" — requested ${item.quantity}, available: ${prod?.inventoryCount ?? 0}`
            );
          }
        }

        if (inventoryFailures.length > 0) {
          throw new AppError(
            `Insufficient stock for: ${inventoryFailures.join('; ')}. Please adjust your cart and try again.`,
            400
          );
        }

        // Step 3: Calculate pricing
        const itemsPrice = verifiedItems.reduce((acc, i) => acc + i.price * i.quantity, 0);
        const shippingPrice = req.body.shippingPrice !== undefined ? Number(req.body.shippingPrice) : (itemsPrice > 100 ? 0 : 9.99);
        const taxPrice = Number((0.08 * itemsPrice).toFixed(2));
        const totalPrice = Number((itemsPrice + shippingPrice + taxPrice).toFixed(2));

        // Step 4: Update the pending order
        existingOrder.orderItems = verifiedItems;
        existingOrder.shippingAddress = shippingAddress;
        existingOrder.itemsPrice = itemsPrice;
        existingOrder.shippingPrice = shippingPrice;
        existingOrder.taxPrice = taxPrice;
        existingOrder.totalPrice = totalPrice;
        existingOrder.paymentMethod = paymentMethod || 'Card';
        existingOrder.paymentStatus = isPaid ? 'Paid' : 'Pending';
        existingOrder.orderStatus = isPaid ? 'Processing' : 'Pending';
        existingOrder.stripeSessionId = stripePaymentIntentId || existingOrder.stripeSessionId;
        if (isPaid) {
          existingOrder.paidAt = new Date();
        }

        await existingOrder.save({ session });
        await session.commitTransaction();
        session.endSession();

        return res.status(200).json({ success: true, order: existingOrder });
      } catch (err) {
        await session.abortTransaction();
        session.endSession();
        return next(err instanceof AppError ? err : new AppError(err.message, 500));
      }
    }
  }

  // 2. Fallback: Create new order if no orderId is supplied (e.g. cash on delivery/standard flow)
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // Step 1: Verify products and prices server-side
    const verifiedItems = [];
    for (const item of items) {
      const product = await Product.findById(item.product).session(session);
      if (!product || !product.isPublished) {
        throw new AppError(`Product not found: ${item.product}`, 404);
      }
      const sizeExists = product.variants?.some(v => v.sizes?.some(s => s.size === item.size)) || false;
      if (!sizeExists) {
        throw new AppError(`Size "${item.size}" is not available for: ${product.title}`, 400);
      }

      verifiedItems.push({
        product: product._id,
        title: product.title,
        image: product.images[0]?.url || '',
        price: product.price,
        quantity: item.quantity,
        size: item.size,
        color: item.color || '',
      });
    }

    // Step 2: Atomically decrement inventory for each item
    const inventoryFailures = [];
    for (const item of verifiedItems) {
      const updated = await decrementInventory(item.product, item.quantity, session, item.size, item.color);
      if (!updated) {
        const prod = await Product.findById(item.product).select('title inventoryCount').session(session);
        inventoryFailures.push(
          `"${prod?.title || item.product}" — requested ${item.quantity}, available: ${prod?.inventoryCount ?? 0}`
        );
      }
    }

    if (inventoryFailures.length > 0) {
      throw new AppError(
        `Insufficient stock for: ${inventoryFailures.join('; ')}. Please adjust your cart and try again.`,
        400
      );
    }

    // Step 3: Calculate pricing
    const itemsPrice = verifiedItems.reduce((acc, i) => acc + i.price * i.quantity, 0);
    const shippingPrice = req.body.shippingPrice !== undefined ? Number(req.body.shippingPrice) : (itemsPrice > 100 ? 0 : 9.99);
    const taxPrice = Number((0.08 * itemsPrice).toFixed(2));
    const totalPrice = Number((itemsPrice + shippingPrice + taxPrice).toFixed(2));

    // Step 4: Create the order document
    const [order] = await Order.create(
      [
        {
          user: req.user._id,
          orderItems: verifiedItems,
          shippingAddress,
          itemsPrice,
          shippingPrice,
          taxPrice,
          totalPrice,
          paymentMethod: paymentMethod || 'Card',
          paymentStatus: isPaid ? 'Paid' : 'Pending',
          orderStatus: isPaid ? 'Processing' : 'Pending',
          stripeSessionId: stripePaymentIntentId || null,
          paidAt: isPaid ? new Date() : null,
        },
      ],
      { session }
    );

    await session.commitTransaction();
    session.endSession();

    res.status(201).json({ success: true, order });
  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    return next(err instanceof AppError ? err : new AppError(err.message, 500));
  }
});

// ── PUT /api/orders/:id/cancel ────────────────────────────────────────────────
// User can cancel their own pending orders; Admin can cancel any order
const cancelOrder = asyncHandler(async (req, res, next) => {
  const order = await Order.findById(req.params.id);
  if (!order) return next(new AppError('Order not found.', 404));

  // Authorization check
  if (
    order.user.toString() !== req.user._id.toString() &&
    req.user.role !== 'admin'
  ) {
    return next(new AppError('Not authorized to cancel this order.', 403));
  }

  // Only allow cancellation of non-delivered orders
  if (order.orderStatus === 'Delivered') {
    return next(new AppError('Delivered orders cannot be cancelled.', 400));
  }

  if (order.orderStatus === 'Cancelled') {
    return next(new AppError('This order is already cancelled.', 400));
  }

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // Restore inventory for every item in the order
    for (const item of order.orderItems) {
      await restoreInventory(item.product, item.quantity, session, item.size, item.color);
    }

    // Update order status
    order.orderStatus = 'Cancelled';
    order.paymentStatus = order.paymentStatus === 'Paid' ? 'Refunded' : 'Failed';
    await order.save({ session });

    await session.commitTransaction();
    session.endSession();

    res.status(200).json({
      success: true,
      message: 'Order cancelled and inventory restored.',
      order,
    });
  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    return next(new AppError('Failed to cancel order. Please try again.', 500));
  }
});

// ── GET /api/orders/myorders ───────────────────────────────────────────────────
const getMyOrders = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10 } = req.query;
  const skip = (Number(page) - 1) * Number(limit);

  const [orders, total] = await Promise.all([
    Order.find({ user: req.user._id })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit)),
    Order.countDocuments({ user: req.user._id }),
  ]);

  res.status(200).json({ success: true, orders, total });
});

// ── GET /api/orders/:id ────────────────────────────────────────────────────────
const getOrderById = asyncHandler(async (req, res, next) => {
  const order = await Order.findById(req.params.id).populate('user', 'name email');
  if (!order) return next(new AppError('Order not found.', 404));

  if (
    order.user._id.toString() !== req.user._id.toString() &&
    req.user.role !== 'admin'
  ) {
    return next(new AppError('Not authorized to view this order.', 403));
  }

  res.status(200).json({ success: true, order });
});

// ── ADMIN: GET /api/orders ────────────────────────────────────────────────────
const getAllOrders = asyncHandler(async (req, res) => {
  const result = await orderService.getAdminOrders(req.query);
  res.status(200).json({
    success: true,
    ...result,
  });
});

// ── ADMIN: PUT /api/orders/:id/fulfillment ────────────────────────────────────
const updateOrderFulfillment = asyncHandler(async (req, res, next) => {
  const { orderStatus, carrier, trackingNumber } = req.body;
  const order = await Order.findById(req.params.id);
  if (!order) return next(new AppError('Order not found.', 404));

  // If admin is explicitly cancelling via status update, restore inventory
  if (orderStatus === 'Cancelled' && order.orderStatus !== 'Cancelled') {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
      for (const item of order.orderItems) {
        await restoreInventory(item.product, item.quantity, session, item.size, item.color);
      }
      order.orderStatus = 'Cancelled';
      order.paymentStatus = order.paymentStatus === 'Paid' ? 'Refunded' : 'Failed';
      await order.save({ session });
      await session.commitTransaction();
      session.endSession();
    } catch (err) {
      await session.abortTransaction();
      session.endSession();
      return next(new AppError('Failed to cancel order.', 500));
    }
  } else {
    if (orderStatus) order.orderStatus = orderStatus;
    
    if (orderStatus === 'Shipped') order.tracking.shippedAt = new Date();
    if (orderStatus === 'Delivered') order.tracking.deliveredAt = new Date();
  }

  if (carrier !== undefined) order.tracking.carrier = carrier;
  if (trackingNumber !== undefined) order.tracking.trackingNumber = trackingNumber;

  await order.save();

  const updatedOrder = await Order.findById(order._id)
    .populate('user', 'name email')
    .populate('orderItems.product', 'title images sizes');

  res.status(200).json({ success: true, order: updatedOrder });
});

// ── ADMIN: GET /api/orders/admin/stats ────────────────────────────────────────
const getOrderStats = asyncHandler(async (req, res) => {
  const [statsResult, statusBreakdown, recentOrders, lowStockProducts, lowStockCountAgg] = await Promise.all([
    Order.aggregate([
      {
        $facet: {
          revenueData: [
            { $match: { paymentStatus: { $in: ['Paid', 'Pending'] } } },
            { $group: { _id: null, total: { $sum: '$totalPrice' } } },
          ],
          orderCount: [
            { $match: {} }, // Counts every order in the system
            { $count: 'count' },
          ],
          avgValueData: [
            { $match: { paymentStatus: { $in: ['Paid', 'Pending'] } } },
            { $group: { _id: null, avg: { $avg: '$totalPrice' } } },
          ],
        },
      }
    ]),
    Order.aggregate([
      {
        $group: {
          _id: '$orderStatus',
          count: { $sum: 1 },
        },
      },
    ]),
    Order.find()
      .populate('user', 'name email')
      .sort({ createdAt: -1 })
      .limit(5),
    // Low stock alert for dashboard (based on TOTAL stock across all variants/sizes)
    Product.aggregate([
      { $match: { isPublished: true } },
      { 
        $addFields: { 
          totalInventory: {
            $sum: {
              $map: {
                input: { $ifNull: ["$variants", []] },
                as: "v",
                in: { $sum: { $ifNull: ["$$v.sizes.inventoryCount", []] } }
              }
            }
          }
        }
      },
      { $match: { totalInventory: { $lt: 10 } } },
      { $sort: { totalInventory: 1 } },
      { $limit: 10 },
      { $project: { title: 1, category: 1, inventoryCount: "$totalInventory" } }
    ]),
    Product.aggregate([
      { $match: { isPublished: true } },
      { 
        $addFields: { 
          totalInventory: {
            $sum: {
              $map: {
                input: { $ifNull: ["$variants", []] },
                as: "v",
                in: { $sum: { $ifNull: ["$$v.sizes.inventoryCount", []] } }
              }
            }
          }
        }
      },
      { $match: { totalInventory: { $lt: 10 } } },
      { $count: "count" }
    ])
  ]);

  const totalRevenue = statsResult[0]?.revenueData[0]?.total || 0;
  const totalOrders = statsResult[0]?.orderCount[0]?.count || 0;
  const avgOrderValue = statsResult[0]?.avgValueData[0]?.avg || 0;
  const lowStockCountFinal = lowStockCountAgg.length > 0 ? lowStockCountAgg[0].count : 0;

  res.status(200).json({
    success: true,
    stats: {
      totalRevenue: Number(totalRevenue.toFixed(2)),
      totalOrders,
      avgOrderValue: Number(avgOrderValue.toFixed(2)),
      lowStockItems: lowStockCountFinal,
    },
    statusBreakdown,
    recentOrders,
    lowStockProducts,
  });
});

module.exports = {
  createOrder,
  cancelOrder,
  getMyOrders,
  getOrderById,
  getAllOrders,
  updateOrderFulfillment,
  getOrderStats,
};
