const mongoose = require('mongoose');

// 1. Create a sub-schema for team members to hold their specific positions
const teamMemberSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  position: {
    type: String,
    required: true,
    trim: true,
    // e.g., 'Director', 'Secretary', 'Event Coordinator', 'Volunteer'
    default: 'Member' 
  },
  accessLevel: {
    type: String,
    enum: ['admin', 'member'], 
    default: 'member'
  },
  joinedAt: {
    type: Date,
    default: Date.now
  }
}, { _id: false });

// 2. The main Team/Organization Schema
const teamSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Team/Organization name is required'],
      unique: true,
      trim: true,
    },
    description: {
      type: String,
      required: [true, 'Description is required'],
      trim: true,
    },
    logo: {
      type: String,
      default: '',
    },
    // 🔥 New: SaaS-style status toggle for Super Admins
    status: {
      type: String,
      enum: ['active', 'archived'],
      default: 'active'
    },
    // Dynamic Members Array (replaces the single 'admin' and flat 'members' array)
    members: [teamMemberSchema]
  },
  { timestamps: true }
);

module.exports = mongoose.model('Team', teamSchema);