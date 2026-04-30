const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const ActivityLog = require('../models/ActivityLog');
const { protect } = require('../middleware/auth');

// Helper: generate JWT
const generateToken = (userId) => {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '8h',
  });
};

// Helper: get client IP
const getClientIp = (req) => {
  return req.headers['x-forwarded-for']?.split(',')[0] || req.socket.remoteAddress || 'unknown';
};

// POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email, and password are required.' });
    }

    if (password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters.' });
    }

    const existing = await User.findOne({ email: email.toLowerCase().trim() });
    if (existing) {
      // Don't reveal if email exists - use generic message
      return res.status(409).json({ error: 'Registration failed. Please try different credentials.' });
    }

    const user = await User.create({ name, email, password });

    const token = generateToken(user._id);

    res.status(201).json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ error: 'Registration failed.' });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const ip = getClientIp(req);
    const ua = req.headers['user-agent'] || '';

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    // Fetch user with password field
    const user = await User.findOne({ email: email.toLowerCase().trim() }).select('+password');

    if (!user || !user.isActive) {
      // Log failed attempt if user exists
      if (user) {
        await ActivityLog.create({
          user: user._id,
          action: 'LOGIN_FAILED',
          ipAddress: ip,
          userAgent: ua,
          metadata: { reason: 'account_inactive' },
        });
      }
      // Generic message to prevent user enumeration
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    // Check account lock
    if (user.isLocked) {
      return res.status(423).json({ error: 'Account temporarily locked. Please try again later.' });
    }

    const isMatch = await user.comparePassword(password);

    if (!isMatch) {
      // Increment failed attempts
      user.loginAttempts = (user.loginAttempts || 0) + 1;
      if (user.loginAttempts >= 5) {
        // Lock for 15 minutes
        user.lockUntil = new Date(Date.now() + 15 * 60 * 1000);
        user.loginAttempts = 0;
      }
      await user.save();

      await ActivityLog.create({
        user: user._id,
        action: 'LOGIN_FAILED',
        ipAddress: ip,
        userAgent: ua,
        metadata: { attempts: user.loginAttempts },
      });

      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    // Reset failed attempts on success
    user.loginAttempts = 0;
    user.lockUntil = undefined;
    user.lastLogin = new Date();
    await user.save();

    await ActivityLog.create({
      user: user._id,
      action: 'LOGIN',
      ipAddress: ip,
      userAgent: ua,
    });

    const token = generateToken(user._id);

    res.json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Login failed.' });
  }
});

// GET /api/auth/me - get current user info
router.get('/me', protect, async (req, res) => {
  res.json({
    user: {
      id: req.user._id,
      name: req.user.name,
      email: req.user.email,
      role: req.user.role,
      lastLogin: req.user.lastLogin,
    },
  });
});

// POST /api/auth/logout - log the event
router.post('/logout', protect, async (req, res) => {
  try {
    await ActivityLog.create({
      user: req.user._id,
      action: 'LOGOUT',
      ipAddress: getClientIp(req),
      userAgent: req.headers['user-agent'] || '',
    });
    res.json({ message: 'Logged out successfully.' });
  } catch (err) {
    res.status(500).json({ error: 'Logout error.' });
  }
});

module.exports = router;
