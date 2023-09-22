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

router.get('/profile', verifyToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select('-passwordHash');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.status(200).json(user);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update the user's profile (authenticated user)
router.put('/profile', verifyToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const updatedUserData = req.body;

    if (!userId || !updatedUserData) {
      return res.status(400).json({ message: 'Invalid request data' });
    }

    const user = await User.findByIdAndUpdate(userId, updatedUserData, {
      new: true,
    });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.status(200).json({
      user,
    });
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
      .json({ name: savedUser.name, email: savedUser.email, token }); // Include the token in the response
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
        email: user.email,
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

// Delete a user (admin access required)
router.delete('/:id', async (req, res) => {
  try {
    const user = await User.findByIdAndRemove(req.params.id);
    if (!user) {
      res.status(404).json({
        success: false,
        message: 'User not found',
      });
      return;
    }

    if (user.isAdmin) {
      res.status(403).json({
        success: false,
        message: 'Admin User cant be deleted',
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: 'User is deleted',
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message,
    });
  }
});

// Update user by ID (admin access required)
router.put('/:id', verifyToken, async (req, res) => {
  try {
    // Check if the authenticated user is an admin
    const currentUser = await User.findById(req.user.userId);
    if (!currentUser || !currentUser.isAdmin) {
      return res.status(403).json({ message: 'Admin access required' });
    }

    const updatedUserData = req.body;
    console.log(updatedUserData);

    const user = await User.findByIdAndUpdate(req.params.id, updatedUserData, {
      new: true,
    });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.status(200).json(user);
  } catch (error) {
    console.error(error);
    res.status(500).json(error);
  }
});

module.exports = router;
