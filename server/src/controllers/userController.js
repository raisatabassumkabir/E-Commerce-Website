const User = require('../models/User');
const asyncHandler = require('../utils/asyncHandler');

// ── ADMIN: GET /api/users ────────────────────────────────────────────────────
const getAllUsers = asyncHandler(async (req, res) => {
  const users = await User.find({}).select('-password').sort({ createdAt: -1 });
  res.status(200).json({ success: true, users });
});

module.exports = { getAllUsers };
