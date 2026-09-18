// backend/Middlewares/auth.js
const jwt = require('jsonwebtoken');
const User = require('../Models/User');

module.exports = async function auth(req, res, next) {
  const token = req.headers['authorization']; // plain token, not "Bearer ..."

  if (!token) {
    return res
      .status(401)
      .json({ success: false, message: 'Missing authorization token' });
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(payload.id).select('-password');

    if (!user) {
      return res
        .status(401)
        .json({ success: false, message: 'User not found' });
    }

    req.user = user;
    next();
  } catch (err) {
    console.error('auth middleware error:', err);
    return res
      .status(401)
      .json({ success: false, message: 'Invalid or expired token' });
  }
};
