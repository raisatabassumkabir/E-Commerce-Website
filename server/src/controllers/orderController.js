const mongoose = require('mongoose');
const Order = require('../models/Order');
const Product = require('../models/Product');
const asyncHandler = require('../utils/asyncHandler');
const AppError = require('../utils/AppError');

// ── ATOMIC INVENTORY DECREMENT ─────────────────────────────────────────────────
/**
 * Atomically decrements inventoryCount for a product only if sufficient stock exists.
 * Uses MongoDB's $inc with a conditional filter to prevent overselling.
 *
 * Returns the updated product, or null if stock was insufficient.
 */
const decrementInventory = async (productId, quantity, session) => {
  return Product.findOneAndUpdate(
    {
      _id: productId,
      inventoryCount: { $gte: quantity }, // Safety guard: only update if enough stock
    },
    { $inc: { inventoryCount: -quantity } },
    { new: true, session } // Use MongoDB session for transaction support
  );
};

/**
 * Atomically restores inventoryCount when an order is cancelled or payment fails.
 */
const restoreInventory = async (productId, quantity, session) => {
  return Product.findByIdAndUpdate(
    productId,
    { $inc: { inventoryCount: +quantity } },
    { new: true, session }
  );
};

// ── POST /api/orders ───────────────────────────────────────────────────────────
const createOrder = asyncHandler(async (req, res, next) => {
  const { orderItems, shippingAddress } = req.body;

  if (!orderItems || orderItems.length === 0) {
    return next(new AppError('No items in the order.', 400));
  }

  // ── Use MongoDB session for atomic multi-document transaction ──────────────
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // Step 1: Verify products and prices server-side
    const verifiedItems = [];
    for (const item of orderItems) {
      const product = await Product.findById(item.product).session(session);
      if (!product || !product.isPublished) {
        throw new AppError(`Product not found: ${item.product}`, 404);
      }
      if (!product.sizes.includes(item.size)) {
        throw new AppError(`Size "${item.size}" is not available for: ${product.title}`, 400);
      }

      verifiedItems.push({
        product: product._id,
        title: product.title,
        image: product.images[0]?.url || '',
        price: product.price, // ALWAYS server-side price — never client-submitted
        quantity: item.quantity,
        size: item.size,
        color: item.color || '',
      });
    }

    // Step 2: Atomically decrement inventory for each item
    // If any product has insufficient stock, abort the entire transaction.
    const inventoryFailures = [];
    for (const item of verifiedItems) {
      const updated = await decrementInventory(item.product, item.quantity, session);
      if (!updated) {
        // Fetch product name for a better error message
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
    const shippingPrice = itemsPrice > 100 ? 0 : 9.99;
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
          paymentStatus: 'Pending',
          deliveryStatus: 'Processing',
        },
      ],
      { session }
    );

    // Commit the transaction
    await session.commitTransaction();
    session.endSession();

    res.status(201).json({ success: true, order });
  } catch (err) {
    // Rollback all changes (inventory decrements are also rolled back)
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
  if (order.deliveryStatus === 'Delivered') {
    return next(new AppError('Delivered orders cannot be cancelled.', 400));
  }

  if (order.deliveryStatus === 'Cancelled') {
    return next(new AppError('This order is already cancelled.', 400));
  }

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // Restore inventory for every item in the order
    for (const item of order.orderItems) {
      await restoreInventory(item.product, item.quantity, session);
    }

    // Update order status
    order.deliveryStatus = 'Cancelled';
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
  const { page = 1, limit = 20, deliveryStatus, paymentStatus, sort = 'newest' } = req.query;
  const query = {};
  if (deliveryStatus) query.deliveryStatus = deliveryStatus;
  if (paymentStatus) query.paymentStatus = paymentStatus;

  const sortMap = { newest: { createdAt: -1 }, oldest: { createdAt: 1 } };
  const skip = (Number(page) - 1) * Number(limit);

  const [orders, total] = await Promise.all([
    Order.find(query)
      .populate('user', 'name email')
      .sort(sortMap[sort] || { createdAt: -1 })
      .skip(skip)
      .limit(Number(limit)),
    Order.countDocuments(query),
  ]);

  res.status(200).json({
    success: true,
    orders,
    total,
    page: Number(page),
    pages: Math.ceil(total / Number(limit)),
  });
});

// ── ADMIN: PUT /api/orders/:id/status ─────────────────────────────────────────
const updateOrderStatus = asyncHandler(async (req, res, next) => {
  const { deliveryStatus } = req.body;
  const order = await Order.findById(req.params.id);
  if (!order) return next(new AppError('Order not found.', 404));

  // If admin is explicitly cancelling via status update, restore inventory
  if (deliveryStatus === 'Cancelled' && order.deliveryStatus !== 'Cancelled') {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
      for (const item of order.orderItems) {
        await restoreInventory(item.product, item.quantity, session);
      }
      order.deliveryStatus = 'Cancelled';
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
    order.deliveryStatus = deliveryStatus;
    if (deliveryStatus === 'Delivered') order.deliveredAt = new Date();
    await order.save();
  }

  res.status(200).json({ success: true, order });
});

// ── ADMIN: GET /api/orders/admin/stats ────────────────────────────────────────
const getOrderStats = asyncHandler(async (req, res) => {
  const [revenueStats, statusBreakdown, recentOrders, lowStockProducts] = await Promise.all([
    Order.aggregate([
      { $match: { paymentStatus: 'Paid' } },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: '$totalPrice' },
          totalOrders: { $sum: 1 },
          avgOrderValue: { $avg: '$totalPrice' },
        },
      },
    ]),
    Order.aggregate([
      {
        $group: {
          _id: '$deliveryStatus',
          count: { $sum: 1 },
        },
      },
    ]),
    Order.find()
      .populate('user', 'name email')
      .sort({ createdAt: -1 })
      .limit(5),
    // Low stock alert for dashboard
    Product.find({ inventoryCount: { $lte: 5 }, isPublished: true })
      .select('title inventoryCount category')
      .sort({ inventoryCount: 1 })
      .limit(10),
  ]);

  res.status(200).json({
    success: true,
    stats: revenueStats[0] || { totalRevenue: 0, totalOrders: 0, avgOrderValue: 0 },
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
  updateOrderStatus,
  getOrderStats,
};
