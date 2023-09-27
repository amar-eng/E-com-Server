const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { User } = require('../models/user');
const { asyncHandler } = require('../helpers/jwt');
const jwt = require('jsonwebtoken');

// Everyone Access

const registerUser = asyncHandler(async (req, res) => {
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
    res.cookie('token', token, {
      httpOnly: true,
      maxAge: 3 * 60 * 60 * 1000,
    });

    res
      .status(201)
      .json({ name: savedUser.name, email: savedUser.email, token }); // Include the token in the response
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

const loginUser = asyncHandler(async (req, res) => {
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

const logoutUser = asyncHandler(async (req, res) => {
  try {
    // Clear the token cookie
    res.clearCookie('token');

    res.json({ message: 'Logged out successfully.' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Protected Routes => Non Admin Users
const getUserProfile = asyncHandler(async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-passwordHash');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.status(200).json(user);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});
const updateUserProfile = asyncHandler(async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Update user data
    if (req.body.name) user.name = req.body.name;
    if (req.body.email) user.email = req.body.email;

    // If a new password is provided, hash and store it
    if (req.body.password) {
      const salt = await bcrypt.genSalt(10);
      user.passwordHash = await bcrypt.hash(req.body.password, salt);
    }

    // Check if the logged-in user is an admin and if the isAdmin field is present in the request
    if (req.user.isAdmin && typeof req.body.isAdmin !== 'undefined') {
      user.isAdmin = req.body.isAdmin;
    }

    await user.save();

    // Return the updated user without the password hash
    res.status(200).json({
      _id: user._id,
      name: user.name,
      email: user.email,
      isAdmin: user.isAdmin,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Protected Routes => Admin Access
const getUserById = asyncHandler(async (req, res) => {
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

const updateUser = asyncHandler(async (req, res) => {
  try {
    // Check if the authenticated user is an admin
    const currentUser = await User.findById(req.user._id);
    console.log('Current User:', currentUser);
    if (!currentUser || !currentUser.isAdmin) {
      return res.status(403).json({ message: 'Admin access required' });
    }

    const userToUpdate = await User.findById(req.params.id);
    console.log('userToUpdate', userToUpdate);
    if (!userToUpdate) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Update fields selectively
    if (req.body.name) userToUpdate.name = req.body.name;
    if (req.body.email) userToUpdate.email = req.body.email;
    if (req.body.isAdmin !== undefined) userToUpdate.isAdmin = req.body.isAdmin;

    // Check if a new password is provided and then hash it
    if (req.body.password) {
      const salt = await bcrypt.genSalt(10);
      userToUpdate.passwordHash = await bcrypt.hash(req.body.password, salt);
    }

    const updatedUser = await userToUpdate.save();

    // Return the updated user without the password hash
    res.status(200).json({
      _id: updatedUser._id,
      name: updatedUser.name,
      email: updatedUser.email,
      isAdmin: updatedUser.isAdmin,
      // ... add any other fields you wish to return
    });
  } catch (error) {
    console.error(error);
    res.status(500).json(error);
  }
});

const deleteUser = asyncHandler(async (req, res) => {
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

const getUserCount = asyncHandler(async (req, res) => {
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
const getAllUsers = asyncHandler(async (req, res) => {
  try {
    const userList = await User.find().select('-passwordHash');
    res.status(200).json(userList);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = {
  getAllUsers,
  registerUser,
  loginUser,
  logoutUser,
  getUserById,
  getUserProfile,
  updateUser,
  updateUserProfile,
  deleteUser,
  getUserCount,
};
