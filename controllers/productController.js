const { asyncHandler } = require('../helpers/jwt');
const { Product } = require('../models/product');
const mongoose = require('mongoose');
const multer = require('multer');
const { uploadFile } = require('../s3');

const FILE_TYPE_MAP = {
  'image/png': 'png',
  'image/jpeg': 'jpeg',
  'image/jpg': 'jpg',
};

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const isValid = FILE_TYPE_MAP[file.mimetype];
    let uploadError = new Error('invalid image type');

    if (isValid) {
      uploadError = null;
    }
    cb(uploadError, 'public/uploads');
  },
  filename: function (req, file, cb) {
    const fileName = file.originalname.split(' ').join('-');
    const extension = FILE_TYPE_MAP[file.mimetype];
    cb(null, `${fileName}-${Date.now()}.${extension}`);
  },
});

const uploadOptions = multer({ storage: storage });

// @desc    Fetch all products
// @route   GET /api/products
// @access  Public
const getProducts = asyncHandler(async (req, res) => {
  let filter = {};
  if (req.query.categories) {
    filter.category = { $in: req.query.categories.split(',') };
  }

  const pageSize = 30;
  const page = Number(req.query.pageNumber || 1);

  const keyword = req.query.keyword
    ? {
        $or: [
          { name: { $regex: req.query.keyword, $options: 'i' } },
          { brand: { $regex: req.query.keyword, $options: 'i' } },
        ],
      }
    : {};

  const count = await Product.countDocuments({ ...keyword });

  const products = await Product.find({ ...filter, ...keyword })
    .populate('category')
    .limit(pageSize)
    .skip(pageSize * (page - 1));

  if (!products) {
    return res.status(500).json({ success: false });
  }

  res.send({ products, page, pages: Math.ceil(count / pageSize) });
});

// @desc    Fetch single product
// @route   GET /api/products/:id
// @access  Public

const getProductById = asyncHandler(async (req, res) => {
  const productId = req.params.id;
  if (!productId) {
    return res
      .status(400)
      .json({ success: false, message: 'Invalid product ID' });
  }
  const product = await Product.findById(productId).populate('category');
  if (!product) {
    return res
      .status(404)
      .json({ success: false, message: 'Product not found' });
  }
  res.status(200).json({ success: true, product });
});

// @desc    Create a product
// @route   POST /api/products
// @access  Private/Admin

const createProduct = asyncHandler(async (req, res) => {
  const product = new Product({
    name: req.body.name || 'Sample name',
    description: req.body.description || 'Sample description',
    category: req.body.categoryId || 'Standard',
    image: req.body.image || '',
    countInStock: req.body.countInStock || 0,
    richDescription: req.body.richDescription || '',
    images: req.body.images || [],
    brand: req.body.brand || 'Sample brand',
    price: req.body.price || 0,
    rating: req.body.rating || 0,
    numReviews: req.body.numReviews || 0,
    isFeatured: req.body.isFeatured || false,
    gender: req.body.gender || 'Sample gender',
    season: req.body.season || 'Sample season',
    concentration: req.body.concentration || 'Eau De Parfum',
    vibe: req.body.vibe || 'Sample vibe',
    topNotes: req.body.topNotes || ['Sample top note'],
    middleNotes: req.body.middleNotes || ['Sample middle note'],
    baseNotes: req.body.baseNotes || ['Sample base note'],
    occasion: req.body.occasion || 'Night-out',
    longevity: req.body.longevity || 1,
  });

  const createdProduct = await product.save();
  res.status(201).json(createdProduct);
});

// @desc    Create Image Upload
// @route   Post /api/products/upload
// @access  Admin

const uploadSingleImage = async (req, res) => {
  try {
    const file = req.file;
    const result = await uploadFile(file);
    console.log(result);
    res
      .status(200)
      .json({ image: result.Location, imagePath: `/images/${result.Key}` });
  } catch (err) {
    res.status(500).json({ error: err, stack: err.stack });
  }
};

// @desc    Create Multiple Image Upload
// @route   Post /api/products/upload
// @access  Admin

const uploadMultipleImages = async (req, res) => {
  try {
    const files = req.files;
    const uploadPromises = files.map((file) => uploadFile(file));
    const results = await Promise.all(uploadPromises);
    const imageUrls = results.map((result) => result.Location);
    res.status(200).json({ images: imageUrls });
  } catch (err) {
    res.status(500).json({ error: err.message, stack: err.stack });
  }
};

// @desc    UPDATE A Producy
// @route   PUT /api/products/:id
// @access  Admin

const updateProduct = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).send('Invalid Product ID');
    }

    // For main image
    const imageUrl = req.body.image;

    // For additional images
    const imagesPaths = req.body.images || [];

    const productData = {
      name: req.body.name,
      description: req.body.description,
      category: req.body.category,
      image: imageUrl || req.body.image,
      countInStock: req.body.countInStock,
      richDescription: req.body.richDescription,
      images: imagesPaths.length > 0 ? imagesPaths : req.body.images,
      brand: req.body.brand,
      price: req.body.price,
      rating: req.body.rating,
      numReviews: req.body.numReviews,
      isFeatured: req.body.isFeatured,
      gender: req.body.gender,
      season: req.body.season,
      concentration: req.body.concentration,
      vibe: req.body.vibe,
      topNotes: req.body.topNotes,
      middleNotes: req.body.middleNotes,
      baseNotes: req.body.baseNotes,
      occasion: req.body.occasion,
      longevity: req.body.longevity,
    };

    const product = await Product.findByIdAndUpdate(
      req.params.id,
      productData,
      { new: true }
    );

    if (!product) {
      return res
        .status(404)
        .send('The product cannot be updated or was not found');
    }

    res.send(product);
  } catch (error) {
    res.status(500).send({ message: error.message });
  }
};

// @desc    Delete A Product
// @route   DELETE /api/products/:id
// @access  Admin

const deleteProduct = asyncHandler(async (req, res) => {
  try {
    const product = await Product.findByIdAndRemove(req.params.id);
    if (product) {
      res.status(200).json({
        success: true,
        message: 'Product is deleted',
      });
    } else {
      res.status(404).json({
        success: false,
        message: 'Product not found',
      });
    }
  } catch (err) {
    res.status(400).json({
      success: false,
      error: err.message,
    });
  }
});

// @desc     Product Counts (useful for Admin)
// @route   GET /api/products/count
// @access  Admin

const getProductsCount = asyncHandler(async (req, res) => {
  try {
    const productCount = await Product.countDocuments();

    if (!productCount) {
      return res
        .status(500)
        .json({ success: false, message: 'Product not found' });
    }

    res.json({ productCount: productCount });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// @desc    Get Featured Products
// @route   GET /api/products/featured
// @access  Admin

const getFeaturedProducts = asyncHandler(async (req, res) => {
  try {
    const featuredProducts = await Product.find({ isFeatured: true });

    if (!featuredProducts) {
      return res
        .status(500)
        .json({ success: false, message: 'No featured products' });
    }

    res.json({ featuredProducts: featuredProducts });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

const createProductReview = asyncHandler(async (req, res) => {
  const { rating, comment } = req.body;

  const product = await Product.findById(req.params.id);

  if (product) {
    const alreadyReviewed = product.reviews.find(
      (r) => r.user.toString() === req.user._id.toString()
    );

    if (alreadyReviewed) {
      res.status(400);
      throw new Error('Product already reviewed');
    }

    const review = {
      name: req.user.name,
      rating: Number(rating),
      comment,
      user: req.user._id,
    };

    product.reviews.push(review);

    product.numReviews = product.reviews.length;

    product.rating =
      product.reviews.reduce((acc, item) => item.rating + acc, 0) /
      product.reviews.length;

    await product.save();
    res.status(201).json({ message: 'Review added' });
  } else {
    res.status(404);
    throw new Error('Product not found');
  }
});

// @desc    Like a product
// @route   POST /api/products/:id/like
// @access  Private
const likeProduct = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id);

  if (product) {
    // Check if product is already liked by the user
    const alreadyLiked = product.likes.includes(req.user._id);

    if (alreadyLiked) {
      product.likes = product.likes.filter(
        (userId) => userId.toString() !== req.user._id.toString()
      );
    } else {
      product.likes.push(req.user._id);
    }

    await product.save();

    res.json(product);
  } else {
    res.status(404);
    throw new Error('Product not found');
  }
});

// @desc    Get liked products for a user
// @route   GET /api/users/:id/liked-products
// @access  Private
const getLikedProducts = asyncHandler(async (req, res) => {
  const products = await Product.find({ likes: req.user._id });
  res.json(products);
});

module.exports = {
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
};
