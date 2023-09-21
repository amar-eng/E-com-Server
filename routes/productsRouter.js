const express = require('express');
const router = express.Router();
const { Product } = require('../models/product');
const { Category } = require('../models/category');
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

// GET PRODUCTS

router.get('/', async (req, res) => {
  // In the FE if I want more than name and img then add it here
  // in the select method

  let filter = {};
  if (req.query.categories) {
    filter = { category: req.query.categories.split(',') };
  }

  const productList = await Product.find(filter).populate('category');
  // .select('name image price rating brand -_id');

  if (!productList) {
    res.status(500).json({ success: false });
  }
  res.send(productList);
});

// GET A PRODUCT
router.get('/:id', async (req, res) => {
  try {
    const productId = req.params.id; // Extract the product ID from the route parameter

    // Ensure that productId is not undefined or empty
    if (!productId) {
      return res
        .status(400)
        .json({ success: false, message: 'Invalid product ID' });
    }

    // Use the productId to query the database or perform other operations
    const product = await Product.findById(productId).populate('category');

    if (!product) {
      return res
        .status(404)
        .json({ success: false, message: 'Product not found' });
    }

    res.status(200).json({ success: true, product });
  } catch (error) {
    res.status(500).json({
      success: false,
      message:
        'Internal server error, hold on as we try to figure out whats happening',
    });
  }
});

// POST A PRODUCT, without images

router.post('/', async (req, res) => {
  try {
    const categoryId = req.body.category || '6503b4ef5b403d35f00bb633';
    const category = await Category.findById(categoryId);
    if (!category) return res.status(400).send('Invalid Category');

    const product = new Product({
      name: req.body.name || 'Sample name',
      description: req.body.description || 'Sample description',
      category: categoryId,
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
      concentration: req.body.concentration || 'Sample concentration',
      vibe: req.body.vibe || 'Sample vibe',
      topNotes: req.body.topNotes || ['Sample top note'],
      middleNotes: req.body.middleNotes || ['Sample middle note'],
      baseNotes: req.body.baseNotes || ['Sample base note'],
      occasion: req.body.occasion || 'Sample occasion',
    });

    const createdProduct = await product.save();
    res.status(201).json(createdProduct);
  } catch (err) {
    res.status(500).json({
      error: err.message,
      success: false,
    });
  }
});

// Upload a single image
router.post('/upload', uploadOptions.single('image'), async (req, res) => {
  try {
    const fileName = req.file.filename;
    const basePath = `${req.protocol}://${req.get('host')}/public/uploads/`;
    const imageUrl = `${basePath}${fileName}`;
    res.status(200).json({ image: imageUrl });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// upload multiple images
router.post(
  '/upload-images',
  uploadOptions.array('images'),
  async (req, res) => {
    try {
      const basePath = `${req.protocol}://${req.get('host')}/public/uploads/`;
      const imagesUrls = req.files.map((file) => `${basePath}${file.filename}`);
      res.status(200).json({ images: imagesUrls });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
);

// DELETE PRODUCT
router.delete('/:id', async (req, res) => {
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
// EDIT PRODUCT

router.put(
  '/:id',
  uploadOptions.fields([
    { name: 'image', maxCount: 1 },
    { name: 'images', maxCount: 5 },
  ]),
  async (req, res) => {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).send('Invalid Product ID');
    }

    const category = await Category.findById(req.body.category);
    if (!category) {
      return res.status(400).send('Category not found');
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
      image: imageUrl || req.body.image, // Use the new image if uploaded, otherwise keep the old one
      countInStock: req.body.countInStock,
      richDescription: req.body.richDescription,
      images: imagesPaths.length > 0 ? imagesPaths : req.body.images, // Use new gallery images if uploaded, otherwise keep the old ones
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
  }
);

// Product Counts (useful for Admin)
router.get('/get/count', async (req, res) => {
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

// Get Featured products
router.get('/get/featured', async (req, res) => {
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
// Get limited Featured Products
router.get(`/get/featured/:count`, async (req, res) => {
  try {
    const count = req.params.count ? req.params.count : 0;
    const featuredProducts = await Product.find({ isFeatured: true }).limit(
      +count
    );

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

// router.put(
//   '/gallery/:id',
//   uploadOptions.array('images', 10),
//   async (req, res) => {
//     try {
//       if (!mongoose.isValidObjectId(req.params.id)) {
//         return res.status(400).send('Invalid Product Id');
//       }

//       const files = req.files;
//       const basePath = `${req.protocol}://${req.get('host')}/public/uploads/`;

//       const imagesPaths = files.map((file) => `${basePath}${file.filename}`);

//       const product = await Product.findByIdAndUpdate(
//         req.params.id,
//         {
//           images: imagesPaths,
//         },
//         { new: true }
//       );

//       if (!product) {
//         return res.status(500).send('The gallery cannot be updated!');
//       }

//       res.send(product);
//     } catch (err) {
//       res.status(500).json({
//         error: err.message,
//         success: false,
//       });
//     }
//   }
// );

module.exports = router;
