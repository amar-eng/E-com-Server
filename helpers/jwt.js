const jwt = require('jsonwebtoken');
const { User } = require('../models/user'); // make sure to provide the correct path

// This is an utility function to handle asynchronous functions in middleware
const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

const protect = asyncHandler(async (req, res, next) => {
  let token;

  // Check for auth-token
  if (req.headers['auth-token']) {
    token = req.headers['auth-token'];
  }
  // Else, check for token in cookies
  else if (req.cookies.jwt) {
    token = req.cookies.jwt;
  }

  if (!token) {
    return res.status(401).json({ error: 'Not authorized, no token' });
  }

  try {
    const decoded = jwt.verify(token, process.env.SECRET);

    req.user = await User.findById(decoded.userId).select('-password');

    if (!req.user) {
      return res
        .status(404)
        .json({ error: 'User from token not found in database.' });
    }

    next();
  } catch (error) {
    console.error('JWT Verification Error:', error.message);
    return res.status(401).json({ error: 'Not authorized, token failed' });
  }
});

const admin = (req, res, next) => {
  if (req.user && req.user.isAdmin) {
    next();
  } else {
    return res
      .status(401)
      .json({ error: 'Not authorized- Admin access required' });
  }
};

module.exports = {
  protect,
  admin,
  asyncHandler,
};
