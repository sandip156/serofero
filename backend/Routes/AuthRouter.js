// backend/Routes/AuthRouter.js
const router = require('express').Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const User = require('../Models/User');

// POST /auth/signup
router.post('/signup', async (req, res) => {
  try {
    const { name, email, password, contact, address, age } = req.body || {};

    // basic required fields
    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Name, email and password are required',
      });
    }

    // check existing user
    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) {
      return res
        .status(409)
        .json({ success: false, message: 'Email already registered' });
    }

    // hash password
    const hashed = await bcrypt.hash(password, 10);

    // safely parse age (it might come as string from frontend)
    let parsedAge;
    if (age !== undefined && age !== null && age !== '') {
      const n = Number(age);
      if (!Number.isNaN(n)) {
        parsedAge = n;
      }
    }

    const user = await User.create({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      password: hashed,
      contact: contact ? String(contact).trim() : '',
      address: address ? String(address).trim() : '',
      age: parsedAge,
      isAdmin: false, // can be flipped manually in Mongo
    });

    return res.json({
      success: true,
      message: 'Signup successful, you can now log in.',
      userId: user._id,
    });
  } catch (err) {
    console.error('POST /auth/signup error:', err);
    return res
      .status(500)
      .json({ success: false, message: 'Server error during signup' });
  }
});

// POST /auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body || {};

    if (!email || !password) {
      return res
        .status(400)
        .json({ success: false, message: 'Email and password are required' });
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res
        .status(401)
        .json({ success: false, message: 'Invalid email or password' });
    }

    const ok = await bcrypt.compare(password, user.password);
    if (!ok) {
      return res
        .status(401)
        .json({ success: false, message: 'Invalid email or password' });
    }

    const token = jwt.sign(
      {
        id: user._id,
        email: user.email,
        isAdmin: user.isAdmin,
      },
      process.env.JWT_SECRET || 'dev-secret',
      { expiresIn: '7d' }
    );

    return res.json({
      success: true,
      message: 'Login successful',
      jwtToken: token,
      name: user.name,
      isAdmin: user.isAdmin,
      contact: user.contact,
      address: user.address,
      age: user.age,
    });
  } catch (err) {
    console.error('POST /auth/login error:', err);
    return res
      .status(500)
      .json({ success: false, message: 'Server error during login' });
  }
});

/* =========================================================
   ✅ FORGOT PASSWORD + RESET PASSWORD
   ========================================================= */

// POST /auth/forgot-password
// body: { email }
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body || {};
    if (!email) {
      return res
        .status(400)
        .json({ success: false, message: 'Email is required' });
    }

    const user = await User.findOne({
      email: String(email).toLowerCase().trim(),
    });

    // ✅ Always return success to avoid "email enumeration"
    if (!user) {
      return res.json({
        success: true,
        message: 'If that email exists, a reset link has been sent.',
      });
    }

    // raw token -> send to user (email / UI)
    const rawToken = crypto.randomBytes(32).toString('hex');

    // hash token -> store in DB
    const tokenHash = crypto
      .createHash('sha256')
      .update(rawToken)
      .digest('hex');

    user.resetPasswordTokenHash = tokenHash;
    user.resetPasswordExpiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
    await user.save();

    const appUrl = process.env.APP_URL || 'http://localhost:3000';
    const resetLink = `${appUrl}/reset-password?token=${rawToken}`;

    // ✅ For now (no email setup), we return devResetLink for testing
    return res.json({
      success: true,
      message: 'If that email exists, a reset link has been sent.',
      devResetLink: resetLink,
    });
  } catch (err) {
    console.error('POST /auth/forgot-password error:', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

// POST /auth/reset-password
// body: { token, newPassword }
router.post('/reset-password', async (req, res) => {
  try {
    const { token, newPassword } = req.body || {};

    if (!token || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'token and newPassword are required',
      });
    }

    if (String(newPassword).length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters',
      });
    }

    const tokenHash = crypto
      .createHash('sha256')
      .update(String(token))
      .digest('hex');

    const user = await User.findOne({
      resetPasswordTokenHash: tokenHash,
      resetPasswordExpiresAt: { $gt: new Date() },
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Reset link is invalid or expired',
      });
    }

    user.password = await bcrypt.hash(String(newPassword), 10);
    user.resetPasswordTokenHash = null;
    user.resetPasswordExpiresAt = null;
    await user.save();

    return res.json({
      success: true,
      message: 'Password reset successful. Please login.',
    });
  } catch (err) {
    console.error('POST /auth/reset-password error:', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
