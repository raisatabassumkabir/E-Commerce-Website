const jwt = require('jsonwebtoken');

/**
 * Signs a JWT and attaches it as a secure httpOnly cookie to the response.
 * @param {object} res - Express response object
 * @param {string} userId - The user's MongoDB _id
 */
const generateToken = (res, userId) => {
  const token = jwt.sign({ id: userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || '30d',
  });

  const isProduction = process.env.NODE_ENV === 'production';

  res.cookie('jwt', token, {
    httpOnly: true,              // Not accessible via document.cookie
    secure: isProduction,        // HTTPS only in production
    sameSite: isProduction ? 'none' : 'lax', // 'none' required for cross-origin Vercel <-> Railway
    maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days in ms
  });

  return token;
};

/**
 * Clears the JWT cookie (used for logout).
 * @param {object} res - Express response object
 */
const clearToken = (res) => {
  const isProduction = process.env.NODE_ENV === 'production';

  res.cookie('jwt', '', {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'none' : 'lax',
    expires: new Date(0),
  });
};

module.exports = { generateToken, clearToken };
