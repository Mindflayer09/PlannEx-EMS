const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const { ROLES } = require('../utils/constants');

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      maxlength: 100,
    },

    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
    },

    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: 8,
      select: false,
    },

    // App-level role (e.g., SUPER_ADMIN for you, USER for everyone else)
    role: {
      type: String,
      enum: Object.values(ROLES),
      default: ROLES.USER, // Changed from VOLUNTEER to a more general term if you updated your constants
    },

    // 🚀 Replaced 'club' with 'team'
    team: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Team', 
      required: [false],
    },

    isApproved: {
      type: Boolean,
      default: false,
    },

    resetPasswordToken: {
      type: String,
      required: false,
    },

    resetPasswordExpires: {
      type: Date,
      required: false,
    },
    
  },
  { timestamps: true }
);

// Indexes for faster querying
userSchema.index({ team: 1 });
userSchema.index({ isApproved: 1 });
userSchema.pre('save', async function () {
  if (!this.isModified('password')) {
    return; 
  }
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

userSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.password;
  return obj;
};

module.exports = mongoose.model('User', userSchema);