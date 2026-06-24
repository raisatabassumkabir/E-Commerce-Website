const { validationResult } = require('express-validator');
const User = require('../models/User');
const asyncHandler = require('../utils/asyncHandler');
const AppError = require('../utils/AppError');
const { generateToken, clearToken } = require('../utils/generateToken');

// ── POST /api/auth/register ────────────────────────────────────────────────────
const register = asyncHandler(async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return next(new AppError(errors.array()[0].msg, 400));
  }

  const { name, email, password } = req.body;

  const existingUser = await User.findOne({ email });
  if (existingUser) {
    return next(new AppError('An account with this email already exists.', 409));
  }

  const user = await User.create({ name, email, password });

  generateToken(res, user._id);

  res.status(201).json({
    success: true,
    user: {
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      avatar: user.avatar,
    },
  });
});

// ── POST /api/auth/login ───────────────────────────────────────────────────────
const login = asyncHandler(async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return next(new AppError(errors.array()[0].msg, 400));
  }

  const { email, password } = req.body;

  // Explicitly select password field (excluded by default)
  const user = await User.findOne({ email }).select('+password');
  if (!user || !(await user.comparePassword(password))) {
    return next(new AppError('Invalid email or password.', 401));
  }

  if (!user.isActive) {
    return next(new AppError('Your account has been deactivated.', 401));
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

module.exports = { register, login, logout, getMe, updateProfile, updatePassword, addAddress };
