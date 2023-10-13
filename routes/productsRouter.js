const express = require('express');
const router = express.Router();
const { protect, admin } = require('../helpers/jwt');
const {
  getProducts,
  getProductById,
  createProduct,
  uploadSingleImage,
  uploadMultipleImages,
  uploadOptions,
  updateProduct,
  deleteProduct,
  getProductsCount,
  getFeaturedProducts,
  createProductReview,
  likeProduct,
  getLikedProducts,
} = require('../controllers/productController');

// GET PRODUCTS

router.route('/').get(getProducts).post(protect, admin, createProduct);
router.route('/count').get(protect, admin, getProductsCount);
router.route('/featured').get(protect, admin, getFeaturedProducts);
router.route('/:id/reviews').post(protect, createProductReview);
router.post('/:id/like', protect, likeProduct);
router.get('/users/:id/liked-products', protect, getLikedProducts);
router
  .route('/:id')
  .get(getProductById)
  .put(protect, admin, updateProduct)
  .delete(protect, admin, deleteProduct);

router.post(
  '/upload',
  protect,
  admin,
  uploadOptions.single('image'),
  uploadSingleImage
);
router.post(
  '/upload-images',
  protect,
  admin,
  uploadOptions.array('images'),
  uploadMultipleImages
);

module.exports = router;
