const mongoose = require('mongoose');
const { NOTIFICATION_TYPES, NOTIFICATION_STATUSES } = require('../utils/constants');

const notificationSchema = new mongoose.Schema(
  {
    team: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Team',
      required: false, 
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: false, 
    },
    recipient: {
      type: String, // Kept as String (email) in case you email external people (non-users)
      required: true,
    },
    subject: {
      type: String,
      required: true,
    },
    body: {
      type: String,
      required: true,
    },
    type: {
      type: String,
      enum: Object.values(NOTIFICATION_TYPES),
      required: true,
    },
    relatedEntity: {
      entityType: { type: String },
      entityId: { type: mongoose.Schema.Types.ObjectId },
    },
    status: {
      type: String,
      enum: Object.values(NOTIFICATION_STATUSES),
      default: NOTIFICATION_STATUSES.PENDING,
    },
    retryCount: {
      type: Number,
      default: 0,
    },
    sentAt: {
      type: Date,
    },
    error: {
      type: String,
    },
  },
  { timestamps: true }
);

// Keep your existing queue indexes
notificationSchema.index({ status: 1 });
notificationSchema.index({ status: 1, retryCount: 1 });
notificationSchema.index({ team: 1, createdAt: -1 }); 
notificationSchema.index({ user: 1, createdAt: -1 });

module.exports = mongoose.model('Notification', notificationSchema);