const express = require('express');
const { createReview, getProductReviews, deleteReview } = require('../controllers/reviewController');
const { protect, adminOnly } = require('../middleware/authMiddleware');

const router = express.Router({ mergeParams: true }); // allows :productId from parent router

router.get('/:productId', getProductReviews);
router.post('/:productId', protect, createReview);
router.delete('/:id', protect, deleteReview);

module.exports = router;
