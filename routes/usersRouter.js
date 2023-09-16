const { User } = require('../models/user');
const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
const verifyToken = require('../middleware/auth');

router.use(cookieParser());

// Get a list of users (admin access required)
router.get('/', async (req, res) => {
  try {
    const userList = await User.find().select('-passwordHash');
    res.status(200).json(userList);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get user by ID (admin access required)
router.get('/:id', verifyToken, async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-passwordHash');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.status(200).json(user);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Register a new user
router.post('/register', async (req, res) => {
  const { name, email, password, isAdmin } = req.body;

  try {
    const userExists = await User.findOne({ email });

    if (userExists) {
      return res.status(400).json({ message: 'User already exists' });
    }

    const user = new User({
      name,
      email,
      passwordHash: bcrypt.hashSync(password, 10),
      isAdmin,
    });

    const savedUser = await user.save();

    if (!savedUser) {
      return res.status(401).json({ message: 'The user cannot be created' });
    }

    // Generate a token for the newly registered user
    const secret = process.env.SECRET; // Define your secret key here
    const token = jwt.sign(
      {
        userId: savedUser.id,
        isAdmin: savedUser.isAdmin,
      },
      secret, // Use the secret key here
      {
        expiresIn: '3h',
      }
    );

    // Set the token as a cookie with a 3-hour expiration time
    res.cookie('token', token, { httpOnly: true, maxAge: 3 * 60 * 60 * 1000 });

    res
      .status(201)
      .json({ name: savedUser.name, user: savedUser.email, token }); // Include the token in the response
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// User login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).send('Invalid email or password');
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

      // Set the token as a cookie with a 3-hour expiration time
      res.cookie('token', token, {
        httpOnly: true,
        maxAge: 3 * 60 * 60 * 1000,
      });

      return res.status(200).json({
        user: user.email,
        name: user.name,
        id: user.id,
        isAdmin: user.isAdmin,
        token,
      });
    } else {
      return res.status(401).send('Incorrect password');
    }
  } catch (error) {
    console.error(error);
    return res.status(500).send('Internal Server Error');
  }
});

// Update user data (user access required)
router.put('/update', verifyToken, async (req, res) => {
  try {
    const userId = req.user.userId; // Extract user ID from the token
    const updatedUserData = req.body; // This should contain the fields you want to update

    // Find the user by ID (from the token) and update their information
    const user = await User.findByIdAndUpdate(userId, updatedUserData, {
      new: true, // Return the updated user data
    });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Optionally, you can generate a new JWT token if user information has changed

    res.status(200).json({ message: 'User updated successfully', user });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Logout and clear the token cookie
router.post('/logout', (req, res) => {
  try {
    // Clear the token cookie
    res.clearCookie('token');

    res.json({ message: 'Logged out successfully.' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get the count of users
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

// Delete a user (admin access required)
router.delete('/:id', verifyToken, async (req, res) => {
  try {
    const user = await User.findByIdAndRemove(req.params.id);
    if (user) {
      res.status(200).json({
        success: true,
        message: 'User is deleted',
      });
    } else {
      res.status(404).json({
        success: false,
        message: 'User not found',
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
