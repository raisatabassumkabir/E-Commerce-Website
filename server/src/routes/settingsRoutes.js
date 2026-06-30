const express = require('express');
const { getSettings, updateSettings } = require('../controllers/settingsController');
const { protect, adminOnly } = require('../middleware/authMiddleware');
const { uploadProductImages } = require('../middleware/uploadMiddleware');

const router = express.Router();

router.get('/', getSettings);
router.put(
  '/',
  protect,
  adminOnly,
  uploadProductImages.fields([
    { name: 'heroImages', maxCount: 6 },
    { name: 'menImage', maxCount: 1 },
    { name: 'womenImage', maxCount: 1 },
    { name: 'accessoriesImage', maxCount: 1 },
    { name: 'footwearImage', maxCount: 1 },
    { name: 'kidsImage', maxCount: 1 },
    { name: 'saleImage', maxCount: 1 },
  ]),
  updateSettings
);

module.exports = router;
