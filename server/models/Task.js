const mongoose = require('mongoose');
const { TASK_STATUSES, TASK_PRIORITIES, EVENT_PHASES } = require('../utils/constants');

// 🔥 Simplified for better path resolution
const mediaSchema = new mongoose.Schema({
  url: String,
  fileType: String,
  publicId: String
}, { _id: false });

const submissionSchema = new mongoose.Schema(
  {
    media: [mediaSchema],
    notes: { type: String, default: '' },
    uploadedAt: { type: Date, default: Date.now },
  },
  { _id: true }
);

const taskSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, required: true },
    event: { type: mongoose.Schema.Types.ObjectId, ref: 'Event', required: true },
    assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    assignedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    status: { 
      type: String, 
      enum: Object.values(TASK_STATUSES), 
      default: TASK_STATUSES.PENDING 
    },
    deadline: { type: Date, required: true },
    submissions: [submissionSchema],
    priority: { 
      type: String, 
      enum: Object.values(TASK_PRIORITIES), 
      default: TASK_PRIORITIES.MEDIUM 
    },
    phase: { 
      type: String, 
      enum: Object.values(EVENT_PHASES), 
      required: true 
    },
    rejectionReason: { type: String, default: '' },
  },
  { timestamps: true }
);

// Indexes for performance
taskSchema.index({ event: 1 });
taskSchema.index({ assignedTo: 1 });
taskSchema.index({ status: 1 });

module.exports = mongoose.model('Task', taskSchema);