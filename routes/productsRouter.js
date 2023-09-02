const express = require('express');
const router = express.Router();
const { Product } = require('../models/product');

// GET CATEGORIES

router.get('/', async (req, res) => {
  const productList = await Product.find();

  if (!productList) {
    res.status(500).json({ success: false });
  }
  res.send(productList);
});
// POST CATEGORIES

router.post('/', async (req, res) => {
  try {
    const product = new Product({
      name: req.body.name,
      description: req.body.description,
      category: req.body.category,
      image: req.body.image,
      countInStock: req.body.countInStock,
    });

    const createdProduct = await product.save();
    res.status(201).json(createdProduct);
  } catch (err) {
    res.status(500).json({
      error: err,
      success: false,
    });
  }
});

// DELETE CATEGORIES

// EDIT CATEGORIES

module.exports = router;
