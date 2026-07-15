const mongoose = require('mongoose');

const storeSettingsSchema = new mongoose.Schema(
  {
    // ── General ───────────────────────────────────────────────────────────────
    storeName: { type: String, default: 'ThreadHaus' },
    maintenanceMode: { type: Boolean, default: false },

    // ── Hero CMS ──────────────────────────────────────────────────────────────
    heroSubtitle: { type: String, default: 'NEW SS 2026 COLLECTION' },
    heroImageMain: { type: String },
    heroImageTopRight: { type: String },
    heroImageBottomLeft: { type: String },

    // ── Category Banners ──────────────────────────────────────────────────────
    categoryImages: {
      men: { type: String, default: '' },
      women: { type: String, default: '' },
      accessories: { type: String, default: '' },
      footwear: { type: String, default: '' },
      kids: { type: String, default: '' },
      sale: { type: String, default: '' },
    },

    // ── SEO & Social Meta ─────────────────────────────────────────────────────
    seo: {
      metaTitle: { type: String, default: '' },
      metaDescription: { type: String, default: '' },
      ogImageUrl: { type: String, default: '' },
    },

    // ── Currency & Tax ────────────────────────────────────────────────────────
    currency: {
      symbol: { type: String, default: '$' },
      code: { type: String, default: 'USD' },
      taxRate: { type: Number, default: 0, min: 0, max: 100 },
      taxInclusive: { type: Boolean, default: false },
    },

    // ── Shipping Configuration ────────────────────────────────────────────────
    shipping: {
      freeShippingThreshold: { type: Number, default: 0, min: 0 },
      flatRate: { type: Number, default: 0, min: 0 },
      estimatedDeliveryDays: { type: Number, default: 5, min: 1, max: 90 },
    },

    // ── Order Policies ────────────────────────────────────────────────────────
    orderPolicies: {
      autoCancelDays: { type: Number, default: 7, min: 1, max: 90 },
      lowStockThreshold: { type: Number, default: 5, min: 1, max: 100 },
    },

    // ── Notification Preferences ──────────────────────────────────────────────
    notifications: {
      newOrderEmail: { type: Boolean, default: true },
      lowStockEmail: { type: Boolean, default: true },
      statusChangeEmail: { type: Boolean, default: false },
    },

    // ── Social Media Links ────────────────────────────────────────────────────
    socialLinks: {
      instagram: { type: String, default: '' },
      twitter: { type: String, default: '' },
      facebook: { type: String, default: '' },
      tiktok: { type: String, default: '' },
    },

    // ── Store Policies ────────────────────────────────────────────────────────
    storePolicies: {
      returnWindowDays: { type: Number, default: 30, min: 0, max: 365 },
      refundPolicyUrl: { type: String, default: '' },
      privacyPolicyUrl: { type: String, default: '' },
      termsUrl: { type: String, default: '' },
    },

    // ── Analytics & Tracking ──────────────────────────────────────────────────
    analytics: {
      googleAnalyticsId: { type: String, default: '' },
      facebookPixelId: { type: String, default: '' },
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('StoreSettings', storeSettingsSchema);
