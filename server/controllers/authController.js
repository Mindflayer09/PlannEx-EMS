const User = require('../models/User');
const Team = require('../models/Team');
const OTP = require('../models/Otp');
const { generateToken } = require('../utils/tokenUtils');
const { sendEmail, templates } = require('../services/emailService');
const crypto = require('crypto');
const { OAuth2Client } = require('google-auth-library');
const client = new OAuth2Client(process.env.VITE_GOOGLE_CLIENT_ID);
const axios = require('axios');

// ==========================================
// REGISTRATION STEP 1: Request OTP
// ==========================================
exports.requestRegistrationOTP = async (req, res, next) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ success: false, message: 'Email is required' });

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ success: false, message: 'Email already in use. Please log in.' });
    }

    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    await OTP.deleteMany({ email }); 
    await OTP.create({ email, otp: otpCode });
  
    const template = templates.verificationCode(otpCode);
    await sendEmail(email, template.subject, template.body);

    res.status(200).json({ success: true, message: 'Verification code sent to your email.' });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// REGISTRATION STEP 2: Verify OTP & Create User
// ==========================================
exports.verifyRegistrationAndCreateUser = async (req, res, next) => {
  try {
    const { email, otp, name, password, role, teamId, team, club } = req.body;

    const validOTP = await OTP.findOne({ email, otp });
    if (!validOTP) {
      return res.status(400).json({ success: false, message: 'Invalid or expired verification code' });
    }

    await OTP.deleteOne({ _id: validOTP._id });

    // Organization Validation
    const finalTeamId = teamId || team || club || null;
    let teamName = "the platform";
    
    if (finalTeamId) {
      const foundTeam = await Team.findById(finalTeamId);
      if (!foundTeam) return res.status(404).json({ success: false, message: 'Organization not found' });
      teamName = foundTeam.name;
    }

    // 🚀 ROLE LOGIC: Handle 'sub-admin' correctly
    const userRole = role || 'user';
    
    // Super Admins are auto-approved. 
    // In a production app, Admins/Sub-Admins usually wait for Super Admin approval.
    const user = await User.create({
      name,
      email,
      password, 
      team: finalTeamId, 
      role: userRole,
      isApproved: userRole === 'super_admin' ? true : false 
    });

    // ✅ TWO-WAY LINKING: Update the Team's member array
    if (finalTeamId) {
      // Determine Team-level access based on App-level role
      let accessLevel = 'member';
      let position = 'Member';

      if (userRole === 'admin') {
        accessLevel = 'admin';
        position = 'Organization Admin';
      } else if (userRole === 'sub-admin') {
        accessLevel = 'member'; // They are members in the Team schema, but have 'sub-admin' App Role
        position = 'Sub-Admin';
      }

      await Team.findByIdAndUpdate(finalTeamId, {
        $push: { 
          members: { 
            user: user._id, 
            accessLevel,
            position,
            joinedAt: new Date()
          } 
        }
      });
    }

    const populatedUser = await User.findById(user._id).populate('team', 'name');
    const token = generateToken(populatedUser);

    res.status(201).json({
      success: true,
      message: userRole === 'super_admin' 
        ? "Registration successful! Welcome to the Command Center."
        : `Registration successful! You have applied to join ${teamName}. Please wait for approval.`,
      data: {
        token,
        user: {
          _id: populatedUser._id,
          name: populatedUser.name,
          email: populatedUser.email,
          role: populatedUser.role,
          team: populatedUser.team,
          isApproved: populatedUser.isApproved,
        }
      }
    });

  } catch (error) {
    next(error);
  }
};

// ==========================================
// LOGIN: Password-based
// ==========================================
exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email }).select('+password').populate('team', 'name');
    
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }
    const privilegedRoles = ['super_admin', 'admin', 'sub-admin'];
    const isStaff = privilegedRoles.includes(user.role);

    if (!user.isApproved && !isStaff) {
      return res.status(403).json({
        success: false,
        message: 'Your account is pending approval by your team administrator.',
      });
    }

    const token = generateToken(user);

    res.json({
      success: true,
      data: {
        token,
        user: {
          _id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          team: user.team,
          isApproved: user.isApproved,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// GET ME: Get Current User Profile
// ==========================================
exports.getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id).select('-password').populate('team', 'name');
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    
    res.status(200).json({ success: true, data: { user } });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// FORGOT PASSWORD
// ==========================================
exports.forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ success: false, message: 'Email is required' });

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ success: false, message: 'There is no user with that email address.' });
    }

    // 1. Generate random token
    const resetToken = crypto.randomBytes(32).toString('hex');

    // 2. Save token and set expiration to 1 hour (3600000 ms)
    user.resetPasswordToken = resetToken;
    user.resetPasswordExpires = Date.now() + 3600000;
    
    // Use { validateBeforeSave: false } just in case your schema enforces other rules we aren't fulfilling here
    await user.save({ validateBeforeSave: false }); 

    // 3. Create the reset URL (ensure your frontend URL is accurate here or via .env)
    const frontendURL = process.env.CLIENT_URL || 'http://localhost:5173';
    const resetUrl = `${frontendURL}/reset-password/${resetToken}`;

    // 4. Send the email using your existing emailService
    const subject = 'Password Reset Request - Event Management System';
    const body = `
      <h3>Password Reset Request</h3>
      <p>You requested a password reset. Please click the link below to set a new password:</p>
      <a href="${resetUrl}" target="_blank">${resetUrl}</a>
      <p>If you did not request this, please ignore this email. This link will expire in 1 hour.</p>
    `;

    await sendEmail(user.email, subject, body);

    res.status(200).json({ success: true, message: 'Password reset link sent to your email.' });
  } catch (error) {
    // If anything fails (like email sending), wipe the token off the user so they can try again
    if (req.body.email) {
      const user = await User.findOne({ email: req.body.email });
      if (user) {
        user.resetPasswordToken = undefined;
        user.resetPasswordExpires = undefined;
        await user.save({ validateBeforeSave: false });
      }
    }
    next(error);
  }
};

// ==========================================
// RESET PASSWORD
// ==========================================
exports.resetPassword = async (req, res, next) => {
  try {
    const { token } = req.params;
    const { newPassword } = req.body;

    if (!newPassword) {
      return res.status(400).json({ success: false, message: 'New password is required.' });
    }

    // 1. Find user by token and ensure it hasn't expired
    const user = await User.findOne({
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({ success: false, message: 'Password reset token is invalid or has expired.' });
    }

    // 2. Set the new password. (The pre-save hook in your User model will automatically hash this!)
    user.password = newPassword;

    // 3. Clear the reset token fields so the link cannot be used again
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    
    await user.save();

    res.status(200).json({ success: true, message: 'Password successfully updated. You may now log in.' });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// GOOGLE AUTH: Verify Google & Send OTP
// ==========================================
exports.googleAuth = async (req, res, next) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({ success: false, message: "Google token is required" });
    }

    // 1. Verify token with Google
    const googleResponse = await axios.get(`https://www.googleapis.com/oauth2/v3/userinfo?access_token=${token}`);
    const { email, name } = googleResponse.data;
    
    // 2. Check if the user already exists in the database
    const existingUser = await User.findOne({ email });

    if (existingUser) {
      const jwtToken = jwt.sign({ id: existingUser._id }, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRE || '30d'
      });

      return res.status(200).json({
        success: true,
        message: "Google login successful",
        data: { 
          token: jwtToken, 
          user: existingUser 
        } 
      });
    }
    // 3. Generate OTP
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    await OTP.deleteMany({ email }); 
    await OTP.create({ email, otp: otpCode });
  
    // 4. Send the Email
    const template = templates.verificationCode(otpCode);
    await sendEmail(email, template.subject, template.body);

    // 5. Return Google info to frontend (Frontend moves to Step 2)
    return res.status(200).json({ 
      success: true, 
      message: 'Google identity verified. Verification code sent to your email.',
      data: {
        email,
        name,
        isExistingUser: false
      }
    });

  } catch (error) {
    console.error("Google Auth Error:", error);
    res.status(401).json({ success: false, message: 'Google authentication failed.' });
  }
};