const express = require('express');
const router = express.Router();

const cookieParser = require('cookie-parser');
const { protect, admin } = require('../helpers/jwt');
const {
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
} = require('../controllers/userController');

router.use(cookieParser());

router.route('/').get(protect, admin, getAllUsers);
router.route('/register').post(registerUser);
router.route('/login').post(loginUser);
router.route('/logout').post(logoutUser);
router.route('/count').get(protect, admin, getUserCount);
router
  .route('/profile')
  .get(protect, getUserProfile)
  .put(protect, updateUserProfile);

router
  .route('/:id')
  .delete(protect, admin, deleteUser)
  .get(protect, admin, getUserById)
  .put(protect, admin, updateUser);

module.exports = router;
