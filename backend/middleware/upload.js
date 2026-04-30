const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');

// Secure upload directory - OUTSIDE public folder
const UPLOAD_DIR = path.join(__dirname, '..', 'secure_storage');

// Ensure directory exists on startup
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

// Allowed MIME types
const ALLOWED_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'text/plain',
];

// Max file size: 50MB
const MAX_SIZE = 50 * 1024 * 1024;

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOAD_DIR);
  },
  filename: (req, file, cb) => {
    // Use UUID as filename - never expose original name on disk
    const ext = path.extname(file.originalname).toLowerCase();
    const safeExt = ext.replace(/[^a-z0-9.]/g, ''); // Sanitize extension
    cb(null, `${uuidv4()}${safeExt}`);
  },
});

const fileFilter = (req, file, cb) => {
  if (ALLOWED_TYPES.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`File type not allowed. Allowed: PDF, images, text files.`), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: MAX_SIZE,
    files: 1, // One file per request
  },
});

module.exports = { upload, UPLOAD_DIR };
