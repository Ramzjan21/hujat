const mongoose = require('mongoose');

const documentSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Document title is required'],
    trim: true,
    maxlength: [200, 'Title too long'],
  },
  description: {
    type: String,
    trim: true,
    maxlength: [1000, 'Description too long'],
  },
  // Stored filename on disk (UUID-based, NOT original name for security)
  storedFilename: {
    type: String,
    required: true,
  },
  // Original filename shown to users
  originalFilename: {
    type: String,
    required: true,
  },
  mimeType: {
    type: String,
    required: true,
    enum: [
      'application/pdf',
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
      'text/plain',
    ],
  },
  fileSize: {
    type: Number,
    required: true,
  },
  uploadedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  // List of users who have access
  allowedUsers: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  }],
  // Optional expiration date for access
  expiresAt: {
    type: Date,
    default: null,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  // Track total view count
  viewCount: {
    type: Number,
    default: 0,
  },
}, { timestamps: true });

// Virtual: check if document access is expired
documentSchema.virtual('isExpired').get(function () {
  if (!this.expiresAt) return false;
  return new Date() > this.expiresAt;
});

// Check if a specific user has access
documentSchema.methods.hasAccess = function (userId) {
  if (!this.isActive) return false;
  if (this.isExpired) return false;
  return this.allowedUsers.some(id => id.toString() === userId.toString());
};

module.exports = mongoose.model('Document', documentSchema);
