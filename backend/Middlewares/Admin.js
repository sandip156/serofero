// backend/Middlewares/Admin.js
const jwt = require('jsonwebtoken');
const User = require('../Models/User');
const requireAdmin = require('../Middlewares/Admin');
module.exports = function requireAdmin(req, res, next) {
  if (!req.user?.isAdmin) {
    return res.status(403).json({ success: false, message: 'Admin only' });
  }
  next();
};

module.exports = async function ensureAdmin(req, res, next) {
  const raw = req.headers.authorization || req.headers.Authorization;

  if (!raw) {
    return res
      .status(401)
      .json({ success: false, message: 'Missing authorization token' });
  }

  const token = String(raw).startsWith('Bearer ')
    ? String(raw).slice(7).trim()
    : String(raw).trim();

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET || 'dev-secret');

    const userId = payload.id || payload._id || payload.userId;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Invalid token payload' });
    }

    const user = await User.findById(userId).select('name email isAdmin');
    if (!user) {
      return res.status(401).json({ success: false, message: 'User not found' });
    }

    if (!user.isAdmin) {
      return res.status(403).json({ success: false, message: 'Admin access required' });
    }

    req.user = {
      id: String(user._id),
      name: user.name,
      email: user.email,
      isAdmin: true,
    };

    next();
  } catch (err) {
    return res.status(401).json({ success: false, message: 'Invalid or expired token' });
  }
};
