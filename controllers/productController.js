const { asyncHandler } = require('../helpers/jwt');
const { Product } = require('../models/product');
const mongoose = require('mongoose');
const multer = require('multer');

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

  const pageSize = 10;
  const page = Number(req.query.pageNumber || 1);

  const keyword = req.query.keyword
    ? { name: { $regex: req.query.keyword, $options: 'i' } }
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
  });

  const createdProduct = await product.save();
  res.status(201).json(createdProduct);
});

// @desc    Create Image Upload
// @route   Post /api/products/upload
// @access  Admin

const uploadSingleImage = async (req, res) => {
  try {
    const fileName = req.file.filename;
    const basePath = `${req.protocol}://${req.get('host')}/public/uploads/`;
    const imageUrl = `${basePath}${fileName}`;
    res.status(200).json({ image: imageUrl });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// @desc    Create Multiple Image Upload
// @route   Post /api/products/upload
// @access  Admin

const uploadMultipleImages = async (req, res) => {
  try {
    const basePath = `${req.protocol}://${req.get('host')}/public/uploads/`;
    const imagesUrls = req.files.map((file) => `${basePath}${file.filename}`);
    res.status(200).json({ images: imagesUrls });
  } catch (err) {
    res.status(500).json({ error: err.message });
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

    const basePath = `${req.protocol}://${req.get('host')}/public/uploads/`;

    // For main image
    const fileName =
      req.files && req.files.image ? req.files.image[0].filename : null;
    const imagesPaths =
      req.files && req.files.images
        ? req.files.images.map((file) => `${basePath}${file.filename}`)
        : [];
    const imageUrl = fileName ? `${basePath}${fileName}` : '';

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
};
