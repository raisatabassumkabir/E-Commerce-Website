const jwt = require('jsonwebtoken');
const asyncHandler = require('../utils/asyncHandler');
const AppError = require('../utils/AppError');
const User = require('../models/User');

/**
 * protect — verifies JWT from httpOnly cookie.
 * Attaches the authenticated user to req.user.
 */
const protect = asyncHandler(async (req, res, next) => {
  const token = req.cookies?.jwt;

  if (!token) {
    return next(new AppError('Not authenticated. Please log in.', 401));
  }

  // Verify token
  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET);
  } catch (err) {
    return next(new AppError('Invalid or expired token. Please log in again.', 401));
  }

  // Check user still exists
  const currentUser = await User.findById(decoded.id).select('-password');
  if (!currentUser) {
    return next(new AppError('The user belonging to this token no longer exists.', 401));
  }

  if (!currentUser.isActive) {
    return next(new AppError('Your account has been deactivated. Contact support.', 401));
  }

  req.user = currentUser;
  next();
});

/**
 * adminOnly — must be used AFTER protect.
 * Blocks access if the user's role is not 'admin'.
 */
const adminOnly = (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    return next();
  }
  return next(new AppError('Access denied. Admin privileges required.', 403));
};

module.exports = { protect, adminOnly };
