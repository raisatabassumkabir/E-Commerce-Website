const Product = require('../models/Product');
const cloudinary = require('../config/cloudinary');
const asyncHandler = require('../utils/asyncHandler');
const AppError = require('../utils/AppError');

// ── SHARED FILTER BUILDER ──────────────────────────────────────────────────────
const buildProductQuery = (queryParams) => {
  const {
    keyword, category, subcategory, size, color,
    minPrice, maxPrice, featured, tags,
  } = queryParams;

  const query = { isPublished: true };

  if (keyword) query.$text = { $search: keyword };
  if (category) query.category = { $in: Array.isArray(category) ? category : [category] };
  if (subcategory) query.subcategory = { $in: Array.isArray(subcategory) ? subcategory : [subcategory] };
  if (size) query.sizes = { $in: Array.isArray(size) ? size : [size] };
  if (color) query['colors.name'] = { $in: Array.isArray(color) ? color : [color] };
  if (featured === 'true') query.isFeatured = true;
  if (tags) query.tags = { $in: Array.isArray(tags) ? tags : [tags] };
  if (minPrice || maxPrice) {
    query.price = {};
    if (minPrice) query.price.$gte = Number(minPrice);
    if (maxPrice) query.price.$lte = Number(maxPrice);
  }

  return query;
};

const buildSortOptions = (sort) => {
  const map = {
    newest: { createdAt: -1 },
    oldest: { createdAt: 1 },
    'price-asc': { price: 1 },
    'price-desc': { price: -1 },
    'rating-desc': { ratings: -1 },
    popular: { numReviews: -1 },
    'name-asc': { title: 1 },
  };
  return map[sort] || { createdAt: -1 };
};

// ── PUBLIC: GET /api/products ──────────────────────────────────────────────────
// inventoryCount is STRICTLY EXCLUDED. Customers see only isAvailable virtual.
const getProducts = asyncHandler(async (req, res) => {
  const { sort = 'newest', page = 1, limit = 12 } = req.query;
  const query = buildProductQuery(req.query);
  const skip = (Number(page) - 1) * Number(limit);

  const [products, total] = await Promise.all([
    Product.find(query)
      .select('-inventoryCount') // ← CRITICAL: never expose stock numbers publicly
      .sort(buildSortOptions(sort))
      .skip(skip)
      .limit(Number(limit))
      .lean({ virtuals: true }), // include isAvailable, stockStatus virtuals
    Product.countDocuments(query),
  ]);

  res.status(200).json({
    success: true,
    count: products.length,
    total,
    page: Number(page),
    pages: Math.ceil(total / Number(limit)),
    products,
  });
});

// ── PUBLIC: GET /api/products/:id ─────────────────────────────────────────────
const getProductById = asyncHandler(async (req, res, next) => {
  const product = await Product.findById(req.params.id)
    .select('-inventoryCount') // ← CRITICAL
    .lean({ virtuals: true });

  if (!product || !product.isPublished) {
    return next(new AppError('Product not found.', 404));
  }
  res.status(200).json({ success: true, product });
});

// ── ADMIN: GET /api/admin/products ────────────────────────────────────────────
// Includes inventoryCount — only accessible by admin via protect + adminOnly
const getAdminProducts = asyncHandler(async (req, res) => {
  const { sort = 'newest', page = 1, limit = 50, keyword, category, lowStock } = req.query;

  const query = {};
  if (keyword) query.$text = { $search: keyword };
  if (category) query.category = category;
  if (lowStock === 'true') query.inventoryCount = { $lte: 5 }; // low stock alert

  const skip = (Number(page) - 1) * Number(limit);

  const [products, total] = await Promise.all([
    Product.find(query) // No .select exclusion — admin sees everything
      .sort(buildSortOptions(sort))
      .skip(skip)
      .limit(Number(limit))
      .lean({ virtuals: true }),
    Product.countDocuments(query),
  ]);

  res.status(200).json({
    success: true,
    count: products.length,
    total,
    page: Number(page),
    pages: Math.ceil(total / Number(limit)),
    products,
  });
});

// ── ADMIN: POST /api/products ──────────────────────────────────────────────────
const createProduct = asyncHandler(async (req, res, next) => {
  const body = { ...req.body };

  // Parse JSON fields if sent as multipart form-data
  if (typeof body.sizes === 'string') body.sizes = JSON.parse(body.sizes);
  if (typeof body.colors === 'string') body.colors = JSON.parse(body.colors);
  if (typeof body.tags === 'string') body.tags = JSON.parse(body.tags);
  if (body.inventoryCount !== undefined) body.inventoryCount = Number(body.inventoryCount);

  const images = req.files
    ? req.files.map((f) => {
        const isLocal = !f.path.startsWith('http');
        const url = isLocal 
          ? `${req.protocol}://${req.get('host')}/uploads/${f.filename}` 
          : f.path;
        return { url, publicId: f.filename, alt: body.title };
      })
    : [];

  if (images.length === 0) {
    return next(new AppError('At least one product image is required.', 400));
  }

  const product = await Product.create({ ...body, images });

  // Return full product to admin (with inventoryCount)
  res.status(201).json({ success: true, product: product.toObject({ virtuals: true }) });
});

// ── ADMIN: PUT /api/products/:id ──────────────────────────────────────────────
const updateProduct = asyncHandler(async (req, res, next) => {
  const product = await Product.findById(req.params.id);
  if (!product) return next(new AppError('Product not found.', 404));

  const body = { ...req.body };
  if (typeof body.sizes === 'string') body.sizes = JSON.parse(body.sizes);
  if (typeof body.colors === 'string') body.colors = JSON.parse(body.colors);
  if (typeof body.tags === 'string') body.tags = JSON.parse(body.tags);
  if (body.inventoryCount !== undefined) body.inventoryCount = Number(body.inventoryCount);

  // Existing images list from frontend
  let baseImages = product.images;
  if (body.existingImages !== undefined) {
    baseImages = typeof body.existingImages === 'string'
      ? JSON.parse(body.existingImages)
      : body.existingImages;
  }

  // Delete removed images from Cloudinary
  const removedImages = product.images.filter(
    (img) => !baseImages.some((i) => i.publicId === img.publicId)
  );
  if (removedImages.length > 0) {
    const deletePromises = removedImages.map((img) =>
      cloudinary.uploader.destroy(img.publicId)
    );
    await Promise.allSettled(deletePromises);
  }

  // Append new uploaded images to baseImages
  if (req.files && req.files.length > 0) {
    const newImages = req.files.map((f) => {
      const isLocal = !f.path.startsWith('http');
      const url = isLocal 
        ? `${req.protocol}://${req.get('host')}/uploads/${f.filename}` 
        : f.path;
      return {
        url,
        publicId: f.filename,
        alt: body.title || product.title,
      };
    });
    body.images = [...baseImages, ...newImages];
  } else {
    body.images = baseImages;
  }

  delete body.existingImages;

  Object.assign(product, body);
  const updated = await product.save();

  res.status(200).json({ success: true, product: updated.toObject({ virtuals: true }) });
});

// ── ADMIN: PATCH /api/products/:id/inventory ──────────────────────────────────
// Dedicated restock endpoint — admin sets absolute inventory count
const updateInventory = asyncHandler(async (req, res, next) => {
  const { inventoryCount } = req.body;
  if (inventoryCount === undefined || inventoryCount < 0) {
    return next(new AppError('Valid inventoryCount is required.', 400));
  }

  const product = await Product.findByIdAndUpdate(
    req.params.id,
    { inventoryCount: Number(inventoryCount) },
    { new: true, runValidators: true }
  ).lean({ virtuals: true });

  if (!product) return next(new AppError('Product not found.', 404));

  res.status(200).json({
    success: true,
    message: `Inventory updated. New count: ${product.inventoryCount}`,
    product,
  });
});

// ── ADMIN: DELETE /api/products/:id ───────────────────────────────────────────
const deleteProduct = asyncHandler(async (req, res, next) => {
  const product = await Product.findById(req.params.id);
  if (!product) return next(new AppError('Product not found.', 404));

  // Delete all Cloudinary images
  const deletePromises = product.images.map((img) =>
    cloudinary.uploader.destroy(img.publicId)
  );
  await Promise.allSettled(deletePromises);

  await product.deleteOne();
  res.status(200).json({ success: true, message: 'Product deleted successfully.' });
});

// ── ADMIN: DELETE /api/products/:id/images/:publicId ──────────────────────────
const deleteProductImage = asyncHandler(async (req, res, next) => {
  const product = await Product.findById(req.params.id);
  if (!product) return next(new AppError('Product not found.', 404));

  const decodedId = decodeURIComponent(req.params.publicId);
  await cloudinary.uploader.destroy(decodedId);
  product.images = product.images.filter((img) => img.publicId !== decodedId);
  await product.save();

  res.status(200).json({ success: true, images: product.images });
});

// ── PUBLIC: GET /api/products/subcategories ───────────────────────────────────
// Returns available subcategories per category for filter UI
const getSubcategories = asyncHandler(async (req, res) => {
  const { category } = req.query;
  const match = { isPublished: true };
  if (category) match.category = category;

  const subcategories = await Product.distinct('subcategory', match);
  res.status(200).json({
    success: true,
    subcategories: subcategories.filter(Boolean).sort(),
  });
});

module.exports = {
  getProducts,
  getProductById,
  getAdminProducts,
  createProduct,
  updateProduct,
  updateInventory,
  deleteProduct,
  deleteProductImage,
  getSubcategories,
};
