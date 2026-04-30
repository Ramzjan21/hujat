const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const Document = require('../models/Document');
const ActivityLog = require('../models/ActivityLog');
const { UPLOAD_DIR } = require('../middleware/upload');

// GET /api/documents - barcha aktiv hujjatlarni qaytarish (auth yo'q)
router.get('/', async (req, res) => {
  try {
    const documents = await Document.find({
      isActive: true,
    }).select('title description originalFilename mimeType fileSize expiresAt createdAt viewCount');

    const accessible = documents.filter(doc => !doc.isExpired);

    res.json({ documents: accessible });
  } catch (err) {
    console.error('List documents error:', err);
    res.status(500).json({ error: 'Failed to fetch documents.' });
  }
});

// GET /api/documents/:id/info - hujjat ma'lumotlari (auth yo'q)
router.get('/:id/info', async (req, res) => {
  try {
    const doc = await Document.findById(req.params.id)
      .select('title description originalFilename mimeType fileSize expiresAt isActive viewCount');

    if (!doc) return res.status(404).json({ error: 'Document not found.' });
    if (!doc.isActive || doc.isExpired) return res.status(403).json({ error: 'Document is not available.' });

    res.json({
      document: {
        id: doc._id,
        title: doc.title,
        description: doc.description,
        filename: doc.originalFilename,
        mimeType: doc.mimeType,
        fileSize: doc.fileSize,
        expiresAt: doc.expiresAt,
        isExpired: doc.isExpired,
        viewCount: doc.viewCount,
        createdAt: doc.createdAt,
      },
    });
  } catch (err) {
    console.error('Document info error:', err);
    res.status(500).json({ error: 'Failed to fetch document info.' });
  }
});

// GET /api/documents/:id/view - faylni xavfsiz stream qilish (auth yo'q)
router.get('/:id/view', async (req, res) => {
  try {
    const doc = await Document.findById(req.params.id);

    if (!doc) return res.status(404).json({ error: 'Document not found.' });
    if (!doc.isActive || doc.isExpired) return res.status(403).json({ error: 'Document is not available.' });

    // Build secure file path - use stored UUID filename, NEVER user input
    const filePath = path.join(UPLOAD_DIR, doc.storedFilename);

    // Verify file exists on disk
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'File not found on server.' });
    }

    // Increment view counter
    await Document.findByIdAndUpdate(doc._id, { $inc: { viewCount: 1 } });

    // Set anti-download headers
    res.setHeader('Content-Type', doc.mimeType);
    res.setHeader('Content-Disposition', 'inline'); // Show inline, not download
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    // Prevent embedding in other origins
    res.setHeader('X-Frame-Options', 'DENY');
    // Do NOT set Content-Disposition: attachment - that would trigger download

    // Stream file content - never expose raw file path to client
    const fileStream = fs.createReadStream(filePath);
    fileStream.on('error', (err) => {
      console.error('File stream error:', err);
      if (!res.headersSent) {
        res.status(500).json({ error: 'Error reading file.' });
      }
    });
    fileStream.pipe(res);
  } catch (err) {
    console.error('Document view error:', err);
    res.status(500).json({ error: 'Failed to serve document.' });
  }
});

// POST /api/documents/:id/log - faollikni loglash (auth yo'q, IP bilan)
router.post('/:id/log', async (req, res) => {
  try {
    const { action, metadata } = req.body;

    const allowedActions = [
      'COPY_ATTEMPT', 'PRINT_ATTEMPT', 'SAVE_ATTEMPT',
      'DEVTOOLS_DETECTED', 'TAB_BLUR', 'DOCUMENT_VIEW_END', 'DOWNLOAD_ATTEMPT',
    ];

    if (!allowedActions.includes(action)) {
      return res.status(400).json({ error: 'Invalid action.' });
    }

    const doc = await Document.findById(req.params.id).select('_id');
    if (!doc) return res.status(404).json({ error: 'Document not found.' });

    await ActivityLog.create({
      user: null,
      document: doc._id,
      action,
      ipAddress: req.headers['x-forwarded-for'] || req.socket.remoteAddress,
      userAgent: req.headers['user-agent'] || '',
      metadata: metadata || {},
    });

    res.json({ message: 'Activity logged.' });
  } catch (err) {
    console.error('Log activity error:', err);
    res.status(500).json({ error: 'Failed to log activity.' });
  }
});

module.exports = router;
