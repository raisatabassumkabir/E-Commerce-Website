const express = require('express');
const {
  getProducts,
  getProductById,
  getAdminProducts,
  createProduct,
  updateProduct,
  updateInventory,
  deleteProduct,
  deleteProductImage,
  getSubcategories,
} = require('../controllers/productController');
const { protect, adminOnly } = require('../middleware/authMiddleware');
const { uploadProductImages } = require('../middleware/uploadMiddleware');

const router = express.Router();

// ── Public routes ─────────────────────────────────────────────────────────────
router.get('/', getProducts);                         // inventoryCount EXCLUDED
router.get('/subcategories', getSubcategories);        // filter helper
router.get('/:id', getProductById);                   // inventoryCount EXCLUDED

// ── Admin-only routes ─────────────────────────────────────────────────────────
router.get('/admin/all', protect, adminOnly, getAdminProducts); // inventoryCount INCLUDED

router.post(
  '/',
  protect,
  adminOnly,
  uploadProductImages.array('images', 6),
  createProduct
);
router.put(
  '/:id',
  protect,
  adminOnly,
  uploadProductImages.array('images', 6),
  updateProduct
);
router.patch('/:id/inventory', protect, adminOnly, updateInventory); // Dedicated restock
router.delete('/:id', protect, adminOnly, deleteProduct);
router.delete('/:id/images/:publicId', protect, adminOnly, deleteProductImage);

module.exports = router;
