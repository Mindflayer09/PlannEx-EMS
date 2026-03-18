const mongoose = require('mongoose');

const reportSchema = new mongoose.Schema(
  {
    event: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Event',
      required: true,
    },
    team: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Team',
      required: true,
    },
    content: {
     headline: String,
     leadParagraph: String,
     teamHighlights: [{
     role: String,
     description: String
     }],
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    status: {
      type: String,
      enum: ['draft', 'published'],
      default: 'draft', // Tracks whether report is ready for public display
    },
    isPublic: {
      type: Boolean,
      default: false, // Set to false by default; set to true when event is finalized
    },
  },
  { timestamps: true } // Automatically adds createdAt and updatedAt dates
);

// Index for faster public report queries
reportSchema.index({ isPublic: 1 });
reportSchema.index({ event: 1 });
reportSchema.index({ club: 1 });

module.exports = mongoose.model('Report', reportSchema);