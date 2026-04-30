const mongoose = require('mongoose');

const activityLogSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
  },
  document: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Document',
    default: null,
  },
  action: {
    type: String,
    required: true,
    enum: [
      'LOGIN',
      'LOGOUT',
      'LOGIN_FAILED',
      'DOCUMENT_VIEW_START',
      'DOCUMENT_VIEW_END',
      'COPY_ATTEMPT',
      'PRINT_ATTEMPT',
      'SAVE_ATTEMPT',
      'DEVTOOLS_DETECTED',
      'TAB_BLUR',
      'UNAUTHORIZED_ACCESS_ATTEMPT',
      'DOWNLOAD_ATTEMPT',
    ],
  },
  ipAddress: {
    type: String,
  },
  userAgent: {
    type: String,
  },
  // Extra metadata (duration, details)
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {},
  },
  timestamp: {
    type: Date,
    default: Date.now,
  },
}, { timestamps: false });

// Index for efficient querying
activityLogSchema.index({ user: 1, timestamp: -1 });
activityLogSchema.index({ document: 1, timestamp: -1 });

module.exports = mongoose.model('ActivityLog', activityLogSchema);
