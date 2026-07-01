const StoreSettings = require('../models/StoreSettings');
const asyncHandler = require('../utils/asyncHandler');
const AppError = require('../utils/AppError');

// Helper to resolve local/Cloudinary URL
const getFileUrl = (req, file) => {
  if (!file) return '';
  const isLocal = !file.path.startsWith('http');
  return isLocal
    ? `${req.protocol}://${req.get('host')}/uploads/${file.filename}`
    : file.path;
};

// ── GET /api/settings ─────────────────────────────────────────────────────────
exports.getSettings = asyncHandler(async (req, res) => {
  let settings = await StoreSettings.findOne();
  if (!settings) {
    settings = await StoreSettings.create({});
  }
  res.status(200).json({ success: true, settings });
});

// ── PUT /api/settings ─────────────────────────────────────────────────────────
exports.updateSettings = asyncHandler(async (req, res) => {
  let settings = await StoreSettings.findOne();
  if (!settings) {
    settings = await StoreSettings.create({});
  }

  const { storeName, maintenanceMode } = req.body;

  if (storeName !== undefined) settings.storeName = storeName;
  if (maintenanceMode !== undefined) settings.maintenanceMode = maintenanceMode === 'true';

  // Process hero subtitle
  if (req.body.heroSubtitle !== undefined) {
    settings.heroSubtitle = req.body.heroSubtitle;
  }

  // Process hero image slots
  const heroSlots = ['heroImageMain', 'heroImageTopRight', 'heroImageBottomLeft'];
  heroSlots.forEach(slot => {
    const fileFieldName = slot;
    const bodyFieldName = `existing${slot.charAt(0).toUpperCase() + slot.slice(1)}`;
    
    if (req.files && req.files[fileFieldName]) {
      settings[slot] = getFileUrl(req, req.files[fileFieldName][0]);
    } else if (req.body[bodyFieldName] !== undefined) {
      settings[slot] = req.body[bodyFieldName];
    }
  });

  // Process category images
  const categories = ['men', 'women', 'accessories', 'footwear', 'kids', 'sale'];
  categories.forEach(cat => {
    const fileFieldName = `${cat}Image`;
    const bodyFieldName = `existing${cat.charAt(0).toUpperCase() + cat.slice(1)}Image`;
    
    if (req.files && req.files[fileFieldName]) {
      settings.categoryImages[cat] = getFileUrl(req, req.files[fileFieldName][0]);
    } else if (req.body[bodyFieldName] !== undefined) {
      settings.categoryImages[cat] = req.body[bodyFieldName];
    }
  });

  const updated = await settings.save();
  res.status(200).json({ success: true, settings: updated });
});
