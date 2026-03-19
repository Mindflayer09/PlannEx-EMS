const User = require('../models/User');
const Team = require('../models/Team');
const OTP = require('../models/Otp');
const { generateToken } = require('../utils/tokenUtils');
const { sendEmail, templates } = require('../services/emailService');
const Otp = require('../models/Otp');

// ==========================================
// REGISTRATION STEP 1: Request OTP
// ==========================================
exports.requestRegistrationOTP = async (req, res, next) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ success: false, message: 'Email is required' });

    // 1. Prevent registering an email that already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ success: false, message: 'Email already in use. Please log in.' });
    }

    // 2. Generate and store OTP
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    await OTP.deleteMany({ email });
    await OTP.create({ email, otp: otpCode });
  
    // 3. Send email
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

    // 1. Verify the OTP
    const validOTP = await OTP.findOne({ email, otp });
    // console.log("Verifying OTP:", { email, otp , validOTP });
    if (!validOTP) {
      return res.status(400).json({ success: false, message: 'Invalid or expired verification code' });
    }

    // OTP is valid! Delete it so it can't be reused
    await OTP.deleteOne({ _id: validOTP._id });

    // 2. Organization Validation
    const finalTeamId = teamId || team || club || null;
    let teamName = "the platform";
    if (finalTeamId) {
      const foundTeam = await Team.findById(finalTeamId);
      if (!foundTeam) return res.status(404).json({ success: false, message: 'Organization not found' });
      teamName = foundTeam.name;
    }

    // 3. Create the actual User with their Password
    const userRole = role || 'user';
    let user = await User.create({
      name,
      email,
      password, // Password will be hashed by your User model's pre-save hook
      team: finalTeamId, 
      role: userRole,
      isApproved: userRole === 'super_admin' ? true : false 
    });

    user = await User.findById(user._id).populate('team', 'name');

    // 4. Send Response (You can auto-login here by generating a token, or force them to the login screen)
    const token = generateToken(user);

    res.status(201).json({
      success: true,
      message: userRole === 'super_admin' 
        ? "Registration successful! Welcome to the Command Center."
        : `Registration successful! You have applied to join ${teamName}. Please wait for an admin to approve your account.`,
      data: {
        token,
        user: {
          _id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          team: user.team,
          isApproved: user.isApproved,
        }
      }
    });

  } catch (error) {
    next(error);
  }
};

// ==========================================
// POST /api/auth/login (RESTORED TO ORIGINAL)
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

    const isPlatformAdmin = user.role === 'super_admin' || user.role === 'admin';
    if (!user.isApproved && !isPlatformAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Your account is pending approval. Please contact your team administrator.',
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
// GET /api/auth/me
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