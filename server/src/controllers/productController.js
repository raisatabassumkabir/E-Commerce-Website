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

  if (keyword)     query.$text = { $search: keyword };
  if (category)    query.category    = { $in: Array.isArray(category)    ? category    : [category] };
  if (subcategory) query.subcategory = { $in: Array.isArray(subcategory) ? subcategory : [subcategory] };
  // Variant-aware size & colour filters
  if (size)  query['variants.sizes.size'] = { $in: Array.isArray(size)  ? size  : [size] };
  if (color) query['variants.color']      = { $in: Array.isArray(color) ? color : [color] };
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
    newest:       { createdAt: -1 },
    oldest:       { createdAt:  1 },
    'price-asc':  { price:  1 },
    'price-desc': { price: -1 },
    'rating-desc':{ ratings: -1 },
    popular:      { numReviews: -1 },
    'name-asc':   { title: 1 },
  };
  return map[sort] || { createdAt: -1 };
};

// ── PUBLIC: GET /api/products ──────────────────────────────────────────────────
const getProducts = asyncHandler(async (req, res) => {
  const { sort = 'newest', page = 1, limit = 12 } = req.query;
  const query = buildProductQuery(req.query);
  const skip  = (Number(page) - 1) * Number(limit);

  const [products, total] = await Promise.all([
    Product.find(query)
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
    page:  Number(page),
    pages: Math.ceil(total / Number(limit)),
    products,
  });
});

// ── PUBLIC: GET /api/products/:id ─────────────────────────────────────────────
const getProductById = asyncHandler(async (req, res, next) => {
  const product = await Product.findById(req.params.id).lean({ virtuals: true });

  if (!product || !product.isPublished) {
    return next(new AppError('Product not found.', 404));
  }
  res.status(200).json({ success: true, product });
});

// ── ADMIN: GET /api/products/admin/all ────────────────────────────────────────
const getAdminProducts = asyncHandler(async (req, res) => {
  const { sort = 'newest', page = 1, limit = 50, keyword, category, lowStock } = req.query;

  const query = {};
  if (keyword)  query.$text    = { $search: keyword };
  if (category) query.category = category;
  // Low-stock: any variant/size with ≤5 units, or products with no variants
  if (lowStock === 'true') {
    query.$or = [
      { 'variants.sizes.inventoryCount': { $lte: 5 } },
      { variants: { $size: 0 } },
    ];
  }

  const skip = (Number(page) - 1) * Number(limit);

  const [products, total] = await Promise.all([
    Product.find(query)
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
    page:  Number(page),
    pages: Math.ceil(total / Number(limit)),
    products,
  });
});

// ── ADMIN: POST /api/products ──────────────────────────────────────────────────
const createProduct = asyncHandler(async (req, res, next) => {
  const body = { ...req.body };

  // Parse JSON fields sent as multipart form-data strings
  if (typeof body.variants === 'string') body.variants = JSON.parse(body.variants);
  if (typeof body.tags     === 'string') body.tags     = JSON.parse(body.tags);

  // Remove any stale flat fields that may arrive from an old client
  delete body.sizes;
  delete body.colors;
  delete body.inventoryCount;

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

  res.status(201).json({ success: true, product: product.toObject({ virtuals: true }) });
});

// ── ADMIN: PUT /api/products/:id ──────────────────────────────────────────────
const updateProduct = asyncHandler(async (req, res, next) => {
  const product = await Product.findById(req.params.id);
  if (!product) return next(new AppError('Product not found.', 404));

  const body = { ...req.body };
  if (typeof body.variants === 'string') body.variants = JSON.parse(body.variants);
  if (typeof body.tags     === 'string') body.tags     = JSON.parse(body.tags);

  // Remove stale flat fields
  delete body.sizes;
  delete body.colors;
  delete body.inventoryCount;

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
    await Promise.allSettled(removedImages.map((img) => cloudinary.uploader.destroy(img.publicId)));
  }

  // Append newly uploaded images
  if (req.files && req.files.length > 0) {
    const newImages = req.files.map((f) => {
      const isLocal = !f.path.startsWith('http');
      const url = isLocal
        ? `${req.protocol}://${req.get('host')}/uploads/${f.filename}`
        : f.path;
      return { url, publicId: f.filename, alt: body.title || product.title };
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
// Accepts a full `variants` array to update all inventory in one call.
// Body: { variants: [{color, hex, image, sizes:[{size, inventoryCount}]}] }
const updateInventory = asyncHandler(async (req, res, next) => {
  const { variants } = req.body;
  if (!variants || !Array.isArray(variants)) {
    return next(new AppError('A variants array is required.', 400));
  }

  const product = await Product.findByIdAndUpdate(
    req.params.id,
    { variants },
    { new: true, runValidators: true }
  ).lean({ virtuals: true });

  if (!product) return next(new AppError('Product not found.', 404));

  res.status(200).json({
    success: true,
    message: 'Inventory updated.',
    product,
  });
});

// ── ADMIN: DELETE /api/products/:id ───────────────────────────────────────────
const deleteProduct = asyncHandler(async (req, res, next) => {
  const product = await Product.findById(req.params.id);
  if (!product) return next(new AppError('Product not found.', 404));

  await Promise.allSettled(product.images.map((img) => cloudinary.uploader.destroy(img.publicId)));
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
