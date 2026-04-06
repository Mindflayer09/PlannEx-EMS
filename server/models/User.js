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

    // 🚀 PLATFORM ROLE: For you (e.g., SUPER_ADMIN to see all orgs)
    platformRole: {
      type: String,
      enum: ['SUPER_ADMIN', 'USER'],
      default: 'USER',
    },

    // 🚀 TEAM ROLE: Sent from Register.jsx ("admin", "sub-admin", "volunteer")
    // Note: If you have these in your ROLES constant, you can use Object.values(ROLES) here
    role: {
      type: String,
      enum: ["admin", "sub-admin", "volunteer"],
      default: "volunteer", 
    },

    // Link to their organization
    team: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Team', 
      required: [false],
    },

    // 🚀 THE MAGIC TRIGGER: This defaults to false, keeping them locked
    // in the blurred pending screen until you click "Approve" in your dashboard.
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

// Hash password before saving
userSchema.pre('save', async function () {
  if (!this.isModified('password')) {
    return; 
  }
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

// Compare password method
userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// Remove password from JSON responses globally
userSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.password;
  return obj;
};

module.exports = mongoose.model('User', userSchema);