// backend/Middlewares/requireAuth.js
const jwt = require('jsonwebtoken');
const User = require('../Models/User');

module.exports = async function requireAuth(req, res, next) {
  try {
    const raw = req.headers.authorization || req.headers.Authorization;
    if (!raw) {
      return res.status(401).json({ success: false, message: 'Missing token' });
    }

    // allow: "Bearer <token>" OR "<token>"
    const token = String(raw).startsWith('Bearer ')
      ? String(raw).slice(7).trim()
      : String(raw).trim();

    const secret = process.env.JWT_SECRET || 'dev-secret';
    const payload = jwt.verify(token, secret);

    const userId = payload.id || payload.userId || payload._id;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Invalid token payload' });
    }

    const user = await User.findById(userId).select('_id name email isAdmin');
    if (!user) {
      return res.status(401).json({ success: false, message: 'User not found' });
    }

    // ✅ attach user to request for downstream routes
    req.user = user;

    next();
  } catch (err) {
    return res.status(401).json({ success: false, message: 'Unauthorized' });
  }
};
