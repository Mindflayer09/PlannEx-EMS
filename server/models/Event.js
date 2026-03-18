const mongoose = require('mongoose');
const { EVENT_PHASES } = require('../utils/constants');

const mediaSchema = new mongoose.Schema(
  {
    url: { type: String, required: true },
    fileType: { type: String, required: true },
    publicId: { type: String },
  },
  { _id: false, timestamps: true }
);

const eventSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Event title is required'],
      trim: true,
      maxlength: 200,
    },
    description: {
      type: String,
      required: [true, 'Event description is required'],
      trim: true,
    },
    //  Replaced 'club' with 'team' to support the multi-tenant architecture
    team: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Team', 
      required: [true, 'Team/Organization is required'],
    },
    phase: {
      type: String,
      enum: Object.values(EVENT_PHASES),
      default: EVENT_PHASES.PRE,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    isPublic: {
      type: Boolean,
      default: false,
    },
    isFinalized: {
      type: Boolean,
      default: false,
    },
    media: [mediaSchema],
    
    reportStatus: {
      type: String,
      enum: ['none', 'draft', 'published'],
      default: 'none', 
    },
    budget: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

//  Updated index for the new 'team' reference
eventSchema.index({ team: 1 });
eventSchema.index({ phase: 1 });
eventSchema.index({ isPublic: 1 });
eventSchema.index({ reportStatus: 1 }); 

module.exports = mongoose.model('Event', eventSchema);