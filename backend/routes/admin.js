const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const Document = require('../models/Document');
const User = require('../models/User');
const ActivityLog = require('../models/ActivityLog');
const { protect, adminOnly } = require('../middleware/auth');
const { upload, UPLOAD_DIR } = require('../middleware/upload');

// All admin routes require authentication AND admin role
router.use(protect, adminOnly);

// GET /api/admin/users - list all users
router.get('/users', async (req, res) => {
  try {
    const users = await User.find({}).select('-password').sort({ createdAt: -1 });
    res.json({ users });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch users.' });
  }
});

// PATCH /api/admin/users/:id/toggle - activate or deactivate user
router.patch('/users/:id/toggle', async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found.' });
    if (user.role === 'admin') return res.status(400).json({ error: 'Cannot deactivate admin.' });

    user.isActive = !user.isActive;
    await user.save();
    res.json({ message: `User ${user.isActive ? 'activated' : 'deactivated'}.`, isActive: user.isActive });
  } catch (err) {
    res.status(500).json({ error: 'Failed to toggle user.' });
  }
});

// GET /api/admin/documents - list all documents
router.get('/documents', async (req, res) => {
  try {
    const documents = await Document.find({})
      .populate('uploadedBy', 'name email')
      .populate('allowedUsers', 'name email')
      .sort({ createdAt: -1 });
    res.json({ documents });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch documents.' });
  }
});

// POST /api/admin/documents/upload - upload a new document
router.post('/documents/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded.' });
    }

    const { title, description, allowedUsers, expiresAt } = req.body;

    if (!title) {
      // Clean up uploaded file if validation fails
      fs.unlinkSync(req.file.path);
      return res.status(400).json({ error: 'Document title is required.' });
    }

    // Parse allowedUsers (array of user IDs)
    let userIds = [];
    if (allowedUsers) {
      try {
        userIds = typeof allowedUsers === 'string'
          ? JSON.parse(allowedUsers)
          : allowedUsers;
      } catch {
        userIds = Array.isArray(allowedUsers) ? allowedUsers : [allowedUsers];
      }
    }

    // Validate that all user IDs exist
    if (userIds.length > 0) {
      const validUsers = await User.find({ _id: { $in: userIds } }).select('_id');
      userIds = validUsers.map(u => u._id);
    }

    const document = await Document.create({
      title,
      description: description || '',
      storedFilename: req.file.filename, // UUID-based filename
      originalFilename: req.file.originalname,
      mimeType: req.file.mimetype,
      fileSize: req.file.size,
      uploadedBy: req.user._id,
      allowedUsers: userIds,
      expiresAt: expiresAt ? new Date(expiresAt) : null,
    });

    await document.populate('allowedUsers', 'name email');

    res.status(201).json({ message: 'Document uploaded successfully.', document });
  } catch (err) {
    // Clean up file on error
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    console.error('Upload error:', err);
    res.status(500).json({ error: 'Failed to upload document.' });
  }
});

// PATCH /api/admin/documents/:id - update document metadata/access
router.patch('/documents/:id', async (req, res) => {
  try {
    const { title, description, allowedUsers, expiresAt, isActive } = req.body;

    const doc = await Document.findById(req.params.id);
    if (!doc) return res.status(404).json({ error: 'Document not found.' });

    if (title !== undefined) doc.title = title;
    if (description !== undefined) doc.description = description;
    if (expiresAt !== undefined) doc.expiresAt = expiresAt ? new Date(expiresAt) : null;
    if (isActive !== undefined) doc.isActive = isActive;

    if (allowedUsers !== undefined) {
      let userIds = Array.isArray(allowedUsers) ? allowedUsers : JSON.parse(allowedUsers);
      const validUsers = await User.find({ _id: { $in: userIds } }).select('_id');
      doc.allowedUsers = validUsers.map(u => u._id);
    }

    await doc.save();
    await doc.populate('allowedUsers', 'name email');
    await doc.populate('uploadedBy', 'name email');

    res.json({ message: 'Document updated.', document: doc });
  } catch (err) {
    console.error('Update document error:', err);
    res.status(500).json({ error: 'Failed to update document.' });
  }
});

// DELETE /api/admin/documents/:id - permanently delete document
router.delete('/documents/:id', async (req, res) => {
  try {
    const doc = await Document.findById(req.params.id);
    if (!doc) return res.status(404).json({ error: 'Document not found.' });

    // Remove physical file from secure storage
    const filePath = path.join(UPLOAD_DIR, doc.storedFilename);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    await Document.findByIdAndDelete(req.params.id);
    res.json({ message: 'Document deleted.' });
  } catch (err) {
    console.error('Delete document error:', err);
    res.status(500).json({ error: 'Failed to delete document.' });
  }
});

// PATCH /api/admin/documents/:id/revoke/:userId - revoke specific user access
router.patch('/documents/:id/revoke/:userId', async (req, res) => {
  try {
    const doc = await Document.findById(req.params.id);
    if (!doc) return res.status(404).json({ error: 'Document not found.' });

    doc.allowedUsers = doc.allowedUsers.filter(
      uid => uid.toString() !== req.params.userId
    );
    await doc.save();

    res.json({ message: 'Access revoked.' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to revoke access.' });
  }
});

// GET /api/admin/stats - dashboard statistics
router.get('/stats', async (req, res) => {
  try {
    const [totalUsers, totalDocs, totalLogs, recentLogs] = await Promise.all([
      User.countDocuments({ role: 'user' }),
      Document.countDocuments({ isActive: true }),
      ActivityLog.countDocuments({}),
      ActivityLog.find({})
        .populate('user', 'name email')
        .populate('document', 'title')
        .sort({ timestamp: -1 })
        .limit(20),
    ]);

    res.json({ totalUsers, totalDocs, totalLogs, recentLogs });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch stats.' });
  }
});

module.exports = router;
