const express = require('express');
const router = express.Router();
const ActivityLog = require('../models/ActivityLog');
const { protect, adminOnly } = require('../middleware/auth');

// GET /api/logs - admin: view all logs with filtering
router.get('/', protect, adminOnly, async (req, res) => {
  try {
    const { userId, documentId, action, limit = 50, page = 1 } = req.query;
    const filter = {};

    if (userId) filter.user = userId;
    if (documentId) filter.document = documentId;
    if (action) filter.action = action;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const total = await ActivityLog.countDocuments(filter);

    const logs = await ActivityLog.find(filter)
      .populate('user', 'name email')
      .populate('document', 'title')
      .sort({ timestamp: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    res.json({ logs, total, page: parseInt(page), pages: Math.ceil(total / parseInt(limit)) });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch logs.' });
  }
});

// GET /api/logs/my - current user's own activity
router.get('/my', protect, async (req, res) => {
  try {
    const logs = await ActivityLog.find({ user: req.user._id })
      .populate('document', 'title')
      .sort({ timestamp: -1 })
      .limit(50);

    res.json({ logs });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch your activity.' });
  }
});

module.exports = router;
