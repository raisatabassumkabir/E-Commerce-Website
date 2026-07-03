const crypto = require('crypto');
const { validationResult } = require('express-validator');
const User = require('../models/User');
const asyncHandler = require('../utils/asyncHandler');
const AppError = require('../utils/AppError');
const { generateToken, clearToken } = require('../utils/generateToken');
const { sendVerificationEmail, sendResetPasswordEmail } = require('../utils/email');

// ── POST /api/auth/register ────────────────────────────────────────────────────
const register = asyncHandler(async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return next(new AppError(errors.array()[0].msg, 400));
  }

  const { name, email, password, guestCart } = req.body;

  const existingUser = await User.findOne({ email });
  if (existingUser) {
    return next(new AppError('An account with this email already exists.', 409));
  }

  // Generate unique verification token
  const verificationToken = crypto.randomBytes(32).toString('hex');

  const user = await User.create({
    name,
    email,
    password,
    verificationToken,
    isVerified: false
  });

  if (guestCart && Array.isArray(guestCart)) {
    user.cart = mergeCarts([], guestCart);
    await user.save();
  }

  // Send verification email via Resend
  try {
    await sendVerificationEmail(user.email, user.name, verificationToken);
  } catch (err) {
    // Abort user creation if email fails so they can retry
    await User.findByIdAndDelete(user._id);
    return next(new AppError('Failed to send verification email. Please check your email address and try again.', 500));
  }

  res.status(201).json({
    success: true,
    message: 'Registration successful! A verification link has been sent to your email.',
  });
});

// ── POST /api/auth/login ───────────────────────────────────────────────────────
const login = asyncHandler(async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return next(new AppError(errors.array()[0].msg, 400));
  }

  const { email, password, guestCart } = req.body;

  // Explicitly select password field (excluded by default)
  const user = await User.findOne({ email }).select('+password');
  if (!user || !(await user.comparePassword(password))) {
    return next(new AppError('Invalid email or password.', 401));
  }

  // Block login if user is not verified
  if (!user.isVerified) {
    return next(new AppError('Please verify your email address before logging in.', 403));
  }

  if (!user.isActive) {
    return next(new AppError('Your account has been deactivated.', 401));
  }

  if (guestCart && Array.isArray(guestCart)) {
    user.cart = mergeCarts(user.cart || [], guestCart);
    await user.save();
  }

  generateToken(res, user._id);

  res.status(200).json({
    success: true,
    user: {
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      avatar: user.avatar,
    },
    cart: user.cart,
  });
});

// ── POST /api/auth/logout ──────────────────────────────────────────────────────
const logout = asyncHandler(async (req, res) => {
  clearToken(res);
  res.status(200).json({ success: true, message: 'Logged out successfully.' });
});

// ── GET /api/auth/me ───────────────────────────────────────────────────────────
const getMe = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);
  res.status(200).json({ success: true, user });
});

// ── PUT /api/auth/profile ──────────────────────────────────────────────────────
const updateProfile = asyncHandler(async (req, res, next) => {
  const { name, email } = req.body;

  const user = await User.findById(req.user._id);
  if (!user) return next(new AppError('User not found.', 404));

  if (name) user.name = name;
  if (email) user.email = email;
  
  if (req.file) {
    const isLocal = !req.file.path.startsWith('http');
    user.avatar = isLocal 
      ? `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}` 
      : req.file.path;
  }

  await user.save();

  res.status(200).json({
    success: true,
    user: { _id: user._id, name: user.name, email: user.email, role: user.role, avatar: user.avatar },
  });
});

// ── PUT /api/auth/password ─────────────────────────────────────────────────────
const updatePassword = asyncHandler(async (req, res, next) => {
  const { currentPassword, newPassword } = req.body;

  const user = await User.findById(req.user._id).select('+password');
  if (!(await user.comparePassword(currentPassword))) {
    return next(new AppError('Current password is incorrect.', 401));
  }

  user.password = newPassword;
  await user.save();

  generateToken(res, user._id);
  res.status(200).json({ success: true, message: 'Password updated successfully.' });
});

// ── POST /api/auth/addresses ───────────────────────────────────────────────────
const addAddress = asyncHandler(async (req, res, next) => {
  const user = await User.findById(req.user._id);
  if (!user) return next(new AppError('User not found.', 404));

  const { isDefault } = req.body;
  // If new address is default, unset all others
  if (isDefault) {
    user.addresses.forEach((addr) => (addr.isDefault = false));
  }

  user.addresses.push(req.body);
  await user.save();

  res.status(201).json({ success: true, addresses: user.addresses });
});

// ── PUT /api/auth/cart ──────────────────────────────────────────────────────────
const updateCart = asyncHandler(async (req, res, next) => {
  const user = await User.findById(req.user._id);
  if (!user) return next(new AppError('User not found.', 404));

  user.cart = req.body.cart || [];
  await user.save();

  res.status(200).json({
    success: true,
    cart: user.cart,
  });
});

// ── Cart Merging Helper ─────────────────────────────────────────────────────────
const mergeCarts = (existingCart, guestCart) => {
  const merged = [...existingCart];
  for (const guestItem of guestCart) {
    const existingIndex = merged.findIndex(
      (item) =>
        item.product.toString() === guestItem.product.toString() &&
        item.size === guestItem.size &&
        item.color === guestItem.color
    );
    if (existingIndex > -1) {
      merged[existingIndex].quantity += guestItem.quantity;
    } else {
      merged.push({
        product: guestItem.product,
        title: guestItem.title,
        image: guestItem.image,
        price: guestItem.price,
        size: guestItem.size,
        color: guestItem.color,
        quantity: guestItem.quantity,
      });
    }
  }
  return merged;
};

// ── GET & POST /api/auth/verify-email ──────────────────────────────────────────
const verifyEmail = asyncHandler(async (req, res, next) => {
  const token = req.query.token || req.body.token;

  if (!token) {
    return next(new AppError('Verification token is missing.', 400));
  }

  const user = await User.findOne({ verificationToken: token });
  if (!user) {
    return next(new AppError('Invalid or expired verification token.', 400));
  }

  user.isVerified = true;
  user.verificationToken = undefined;
  await user.save();

  // Log user in automatically after successful verification
  generateToken(res, user._id);

  res.status(200).json({
    success: true,
    message: 'Email verified successfully. You are now logged in.',
    user: {
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      avatar: user.avatar,
    },
    cart: user.cart,
  });
});

// ── POST /api/auth/forgot-password ─────────────────────────────────────────────
const forgotPassword = asyncHandler(async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return next(new AppError(errors.array()[0].msg, 400));
  }

  const { email } = req.body;

  const user = await User.findOne({ email });
  if (!user) {
    return next(new AppError('No account found with this email address.', 404));
  }

  // Generate token and expiration (10 minutes)
  const resetToken = crypto.randomBytes(32).toString('hex');
  user.resetPasswordToken = resetToken;
  user.resetPasswordExpires = Date.now() + 10 * 60 * 1000; // 10 minutes

  await user.save({ validateBeforeSave: false });

  try {
    await sendResetPasswordEmail(user.email, user.name, resetToken);
    res.status(200).json({
      success: true,
      message: 'Password reset link sent to your email.',
    });
  } catch (err) {
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save({ validateBeforeSave: false });
    return next(new AppError('There was an error sending the email. Try again later.', 500));
  }
});

// ── POST /api/auth/reset-password ──────────────────────────────────────────────
const resetPassword = asyncHandler(async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return next(new AppError(errors.array()[0].msg, 400));
  }

  const token = req.params.token || req.body.token || req.query.token;
  const { password } = req.body;

  if (!token) {
    return next(new AppError('Reset token is missing.', 400));
  }

  const user = await User.findOne({
    resetPasswordToken: token,
    resetPasswordExpires: { $gt: Date.now() },
  });

  if (!user) {
    return next(new AppError('Token is invalid or has expired.', 400));
  }

  // Set the new password and clear the reset token/expires fields
  user.password = password;
  user.resetPasswordToken = undefined;
  user.resetPasswordExpires = undefined;
  
  // As a security best practice, resetting password also verifies the user
  user.isVerified = true;
  user.verificationToken = undefined;

  await user.save();

  // Log user in automatically
  generateToken(res, user._id);

  res.status(200).json({
    success: true,
    message: 'Password reset successful! You are now logged in.',
    user: {
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      avatar: user.avatar,
    },
    cart: user.cart,
  });
});

module.exports = {
  register,
  login,
  logout,
  getMe,
  updateProfile,
  updatePassword,
  addAddress,
  updateCart,
  verifyEmail,
  forgotPassword,
  resetPassword,
};
