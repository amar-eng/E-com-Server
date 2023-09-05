const { User } = require('../models/user');
const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

router.get('/', async (req, res) => {
  const userList = await User.find().select('-passwordHash');

  if (!userList) {
    res.status(500).json({ success: false });
  }
  res.send(userList);
});

router.get('/:id', async (req, res) => {
  const user = await User.findById(req.params.id).select('-passwordHash');

  if (!user) {
    res.status(500).json({
      message: 'The user with that ID doesnt exist',
    });
  }
  res.status(200).send(user);
});

router.post('/', async (req, res) => {
  try {
    const user = new User({
      name: req.body.name,
      email: req.body.email,
      passwordHash: bcrypt.hashSync(req.body.password, 10),
      phoneNumber: req.body.phoneNumber,
      isAdmin: req.body.isAdmin,
      street: req.body.street,
      apartment: req.body.apartment,
      postalCode: req.body.postalCode,
      city: req.body.city,
      state: req.body.state,
      country: req.body.country,
    });
    const userCategory = await user.save();
    res.status(201).json(userCategory);
  } catch (err) {
    res.status(500).json({
      error: err,
      success: false,
    });
  }
});

router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).send('User not found');
    }

    if (user && bcrypt.compareSync(password, user.passwordHash)) {
      const secret = process.env.SECRET;
      const token = jwt.sign(
        {
          userId: user.id,
          isAdmin: user.isAdmin,
        },
        secret,
        {
          expiresIn: '3h',
        }
      );

      return res.status(200).json({ user: user.email, token });
    } else {
      return res.status(401).send('Incorrect password');
    }
  } catch (error) {
    console.error(error);
    return res.status(500).send('Internal Server Error');
  }
});

router.post('/register', async (req, res) => {
  let user = new User({
    name: req.body.name,
    email: req.body.email,
    passwordHash: bcrypt.hashSync(req.body.password, 10),
    phoneNumber: req.body.phoneNumber,
    isAdmin: req.body.isAdmin,
    street: req.body.street,
    apartment: req.body.apartment,
    postalCode: req.body.postalCode,
    city: req.body.city,
    state: req.body.state,
    country: req.body.country,
  });
  user = await user.save();

  if (!user) return res.status(401).send('the user cannot be created!');

  res.send(user);
});

router.get('/get/count', async (req, res) => {
  try {
    const userCount = await User.countDocuments();

    if (!userCount) {
      return res
        .status(500)
        .json({ success: false, message: 'User not found' });
    }

    res.json({ userCount: userCount });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const user = await User.findByIdAndRemove(req.params.id);
    if (user) {
      res.status(200).json({
        success: true,
        message: 'user is deleted',
      });
    } else {
      res.status(404).json({
        success: false,
        message: 'user not found',
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
