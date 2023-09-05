const { Category } = require('../models/category');
const express = require('express');
const router = express.Router();

router.get('/', async (req, res) => {
  const categoryList = await Category.find();

  if (!categoryList) {
    res.status(500).json({ success: false });
  }
  res.status(200).send(categoryList);
});

// get by Id

router.get('/:id', async (req, res) => {
  const category = await Category.findById(req.params.id);

  if (!category) {
    res.status(500).json({
      message: 'The category with that ID doesnt exist',
    });
  }
  res.status(200).send(category);
});

router.post('/', async (req, res) => {
  try {
    const category = new Category({
      name: req.body.name,
      icon: req.body.icon,
      color: req.body.color,
    });
    const createdCategory = await category.save();
    res.status(201).json(createdCategory);
  } catch (err) {
    res.status(500).json({
      error: err,
      success: false,
    });
  }
});

// EDIT

router.put('/:id', async (req, res) => {
  const category = await Category.findByIdAndUpdate(
    req.params.id,
    {
      name: req.body.name,
      icon: req.body.icon,
      color: req.body.color,
    },
    { new: true }
  );

  if (!category) return res.status(400).send('the category cant be updated!');

  res.send(category);
});

router.delete('/:id', async (req, res) => {
  try {
    const category = await Category.findByIdAndRemove(req.params.id);

    if (category) {
      res.status(200).json({
        success: true,
        message: 'Category is deleted!',
      });
    } else {
      res.status(404).json({
        success: false,
        message: 'Category not found',
      });
    }
  } catch (err) {
    res.status(400).json({
      success: false,
      error: err.message,
    });
  }
});

module.exports = router;
