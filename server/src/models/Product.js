const mongoose = require('mongoose');

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
        url: { type: String, required: true },
        publicId: { type: String, required: true },
        alt: { type: String, default: '' },
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
    sizes: {
      type: [String],
      required: [true, 'At least one size is required'],
      enum: ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL', 'One Size',
             '6', '7', '8', '9', '10', '11', '12'],
    },
    colors: [
      {
        name: { type: String, required: true },
        hex: { type: String, default: '#000000' },
      },
    ],

    // ── INVENTORY ──────────────────────────────────────────────────────────────
    // NEVER expose this field to the public API. Use .select('-inventoryCount')
    // on every public Mongoose query. Customers only see `isAvailable` (virtual).
    inventoryCount: {
      type: Number,
      required: [true, 'Inventory count is required'],
      min: [0, 'Inventory count cannot be negative'],
      default: 0,
    },

    sku: { type: String, unique: true, sparse: true, trim: true },
    brand: { type: String, default: '', trim: true },

    ratings: { type: Number, default: 0, min: 0, max: 5 },
    numReviews: { type: Number, default: 0 },

    isFeatured: { type: Boolean, default: false },
    isPublished: { type: Boolean, default: true },
  },
  {
    timestamps: true,
    // Enable virtuals in JSON output
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// ── Virtual: isAvailable ───────────────────────────────────────────────────────
// Computed at runtime from inventoryCount. Exposed to customers as binary stock status.
productSchema.virtual('isAvailable').get(function () {
  return this.inventoryCount > 0;
});

// ── Virtual: stockStatus ──────────────────────────────────────────────────────
// Human-readable availability label for the storefront.
productSchema.virtual('stockStatus').get(function () {
  if (this.inventoryCount === 0) return 'Out of Stock';
  if (this.inventoryCount <= 5) return 'Low Stock';
  return 'In Stock';
});

// ── Indexes ────────────────────────────────────────────────────────────────────
productSchema.index({ title: 'text', description: 'text', tags: 'text' });
productSchema.index({ category: 1, subcategory: 1, price: 1 });
productSchema.index({ isFeatured: 1, isPublished: 1 });
productSchema.index({ 'colors.name': 1 });
productSchema.index({ sizes: 1 });

// ── Instance Methods ───────────────────────────────────────────────────────────
/**
 * Returns a safe public representation — strips inventoryCount.
 * Kept for cases where you need programmatic stripping outside Mongoose projections.
 */
productSchema.methods.toPublicJSON = function () {
  const obj = this.toObject({ virtuals: true });
  delete obj.inventoryCount;
  return obj;
};

const Product = mongoose.model('Product', productSchema);
module.exports = Product;
