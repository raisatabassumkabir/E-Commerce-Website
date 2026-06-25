const mongoose = require('mongoose');

// ── Sub-schema: individual size + stock within a variant ──────────────────────
const variantSizeSchema = new mongoose.Schema(
  {
    size: { type: String, required: true, trim: true },
    inventoryCount: { type: Number, default: 0, min: 0 },
  },
  { _id: false }
);

// ── Sub-schema: a single colour variant ──────────────────────────────────────
const variantSchema = new mongoose.Schema(
  {
    color: { type: String, required: true, trim: true },
    hex:   { type: String, default: '#000000' }, // for the colour swatch UI
    image: { type: String, default: '' },        // optional per-variant image URL
    sizes: { type: [variantSizeSchema], default: [] },
  },
  { _id: false }
);

const productSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Product title is required'],
      trim: true,
      maxlength: [200, 'Title cannot exceed 200 characters'],
    },
    description: {
      type: String,
      required: [true, 'Product description is required'],
      maxlength: [2000, 'Description cannot exceed 2000 characters'],
    },
    price: {
      type: Number,
      required: [true, 'Price is required'],
      min: [0, 'Price cannot be negative'],
    },
    comparePrice: {
      type: Number,
      default: null,
    },
    images: [
      {
        url:      { type: String, required: true },
        publicId: { type: String, required: true },
        alt:      { type: String, default: '' },
      },
    ],
    category: {
      type: String,
      required: [true, 'Category is required'],
      enum: ['Men', 'Women', 'Kids', 'Accessories', 'Footwear', 'Sale'],
    },
    subcategory: {
      type: String,
      default: '',
      trim: true,
      // Examples: T-Shirts, Hoodies, Dresses, Jackets, Sneakers, Bags, etc.
    },
    tags: [{ type: String, lowercase: true, trim: true }],

    // ── VARIANTS ──────────────────────────────────────────────────────────────
    // Each variant = one colour option.  Inventory is tracked per size inside it.
    // The top-level isAvailable / stockStatus virtuals aggregate across all variants.
    variants: { type: [variantSchema], default: [] },

    sku:   { type: String, unique: true, sparse: true, trim: true },
    brand: { type: String, default: '', trim: true },

    ratings:    { type: Number, default: 0, min: 0, max: 5 },
    numReviews: { type: Number, default: 0 },

    isFeatured:  { type: Boolean, default: false },
    isPublished: { type: Boolean, default: true },
  },
  {
    timestamps: true,
    toJSON:   { virtuals: true },
    toObject: { virtuals: true },
  }
);

// ── Helper: total stock across every variant → every size ─────────────────────
productSchema.methods.totalInventory = function () {
  return (this.variants || []).reduce(
    (sum, v) => sum + (v.sizes || []).reduce((s, sz) => s + (sz.inventoryCount || 0), 0),
    0
  );
};

// ── Virtual: isAvailable ───────────────────────────────────────────────────────
productSchema.virtual('isAvailable').get(function () {
  return (this.variants || []).some((v) =>
    (v.sizes || []).some((sz) => sz.inventoryCount > 0)
  );
});

// ── Virtual: stockStatus ──────────────────────────────────────────────────────
productSchema.virtual('stockStatus').get(function () {
  const total = (this.variants || []).reduce(
    (sum, v) => sum + (v.sizes || []).reduce((s, sz) => s + (sz.inventoryCount || 0), 0),
    0
  );
  if (total === 0) return 'Out of Stock';
  if (total <= 10) return 'Low Stock';
  return 'In Stock';
});

// ── Indexes ────────────────────────────────────────────────────────────────────
productSchema.index({ title: 'text', description: 'text', tags: 'text' });
productSchema.index({ category: 1, subcategory: 1, price: 1 });
productSchema.index({ isFeatured: 1, isPublished: 1 });
productSchema.index({ 'variants.color': 1 });
productSchema.index({ 'variants.sizes.size': 1 });

// ── Instance Methods ───────────────────────────────────────────────────────────
/**
 * Returns a safe public representation.
 * Nothing sensitive here now that inventoryCount is inside variants,
 * but kept for API consistency.
 */
productSchema.methods.toPublicJSON = function () {
  return this.toObject({ virtuals: true });
};

const Product = mongoose.model('Product', productSchema);
module.exports = Product;
