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
      type: mongoose.Schema.Types.Mixed,
      default: {}
    },
    reportImage: {
      type: String,
      default: ''
    },
    galleryImages: [{
      type: String
    }],
    // 🆕 NEW FIELDS FOR ENHANCED REPORT GENERATION
    selectedMedia: [{
      url: String,
      fileType: String,
      uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
    }],
    customPrompt: {
      type: String,
      default: null
    },
    platform: {
      type: String,
      enum: ['instagram', 'facebook', 'linkedin', 'twitter', 'general'],
      default: 'general'
    },
    wordCount: {
      type: Number,
      default: 0
    },
    socialMediaContent: {
      type: String,
      default: null
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
reportSchema.index({ team: 1 }); 

module.exports = mongoose.model('Report', reportSchema);