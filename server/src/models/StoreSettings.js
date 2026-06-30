const mongoose = require('mongoose');

const storeSettingsSchema = new mongoose.Schema(
  {
    storeName: { type: String, default: 'ThreadHaus' },
    heroImages: { type: [String], default: [] },
    categoryImages: {
      men: { type: String, default: '' },
      women: { type: String, default: '' },
      accessories: { type: String, default: '' },
      footwear: { type: String, default: '' },
      kids: { type: String, default: '' },
      sale: { type: String, default: '' },
    },
    maintenanceMode: { type: Boolean, default: false },
  },
  { timestamps: true }
);

module.exports = mongoose.model('StoreSettings', storeSettingsSchema);
