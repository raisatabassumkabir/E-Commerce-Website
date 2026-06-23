const Review = require('../models/Review');
const Product = require('../models/Product');
const Order = require('../models/Order');
const asyncHandler = require('../utils/asyncHandler');
const AppError = require('../utils/AppError');

// ── POST /api/reviews/:productId ──────────────────────────────────────────────
const createReview = asyncHandler(async (req, res, next) => {
  const { rating, comment, title } = req.body;
  const productId = req.params.productId;

  const product = await Product.findById(productId);
  if (!product) return next(new AppError('Product not found.', 404));

  // Check if user already reviewed this product
  const existing = await Review.findOne({ user: req.user._id, product: productId });
  if (existing) return next(new AppError('You have already reviewed this product.', 409));

  // Check if user purchased this product (verified review)
  const hasPurchased = await Order.findOne({
    user: req.user._id,
    'orderItems.product': productId,
    paymentStatus: 'Paid',
  });

  const review = await Review.create({
    user: req.user._id,
    product: productId,
    rating,
    comment,
    title,
    verified: !!hasPurchased,
  });

  await review.populate('user', 'name avatar');

  res.status(201).json({ success: true, review });
});

// ── GET /api/reviews/:productId ────────────────────────────────────────────────
const getProductReviews = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10 } = req.query;
  const skip = (Number(page) - 1) * Number(limit);

  const [reviews, total] = await Promise.all([
    Review.find({ product: req.params.productId })
      .populate('user', 'name avatar')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit)),
    Review.countDocuments({ product: req.params.productId }),
  ]);

  res.status(200).json({ success: true, reviews, total, page: Number(page) });
});

// ── DELETE /api/reviews/:id (Admin or owner) ───────────────────────────────────
const deleteReview = asyncHandler(async (req, res, next) => {
  const review = await Review.findById(req.params.id);
  if (!review) return next(new AppError('Review not found.', 404));

  if (review.user.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
    return next(new AppError('Not authorized to delete this review.', 403));
  }

  await review.remove(); // triggers post-remove hook for rating recalc
  res.status(200).json({ success: true, message: 'Review deleted.' });
});

module.exports = { createReview, getProductReviews, deleteReview };
