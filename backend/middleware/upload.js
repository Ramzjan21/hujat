const multer = require('multer');
const { v4: uuidv4 } = require('uuid');
const path = require('path');

// Allowed MIME types
const ALLOWED_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'text/plain',
];

// Max file size: 16MB (MongoDB document limit)
const MAX_SIZE = 16 * 1024 * 1024;

// Use memoryStorage — file stored in req.file.buffer, no disk needed
const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  if (ALLOWED_TYPES.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('File type not allowed. Allowed: PDF, images, text files.'), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: MAX_SIZE,
    files: 1,
  },
});

// Generate safe UUID filename for reference
const generateFilename = (originalname) => {
  const ext = path.extname(originalname).toLowerCase().replace(/[^a-z0-9.]/g, '');
  return `${uuidv4()}${ext}`;
};

module.exports = { upload, generateFilename };
