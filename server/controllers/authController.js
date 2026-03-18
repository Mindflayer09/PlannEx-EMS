const User = require('../models/User');
const Team = require('../models/Team');
const { generateToken } = require('../utils/tokenUtils');

// ==========================================
// POST /api/auth/register
// ==========================================
exports.register = async (req, res, next) => {
  try {
    // 1. Extract fields. Allow multiple variations of team ID for backward compatibility
    const { name, email, password, role, teamId, team, club } = req.body;
    
    // Normalize the team ID
    const finalTeamId = teamId || team || club || null;
    let teamName = "the platform"; // Default name if no team is selected

    // 2. Verify the organization exists ONLY IF a teamId was provided
    if (finalTeamId) {
      const foundTeam = await Team.findById(finalTeamId);
      if (!foundTeam) {
        return res.status(404).json({ success: false, message: 'Organization not found' });
      }
      teamName = foundTeam.name; // Safely store the name for the success message
    }

    // 3. Check if the email is already registered
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ success: false, message: 'Email already in use' });
    }

    // 4. Create the user
    const userRole = role || 'user'; // Use the role from the frontend, default to 'user'
    
    const user = await User.create({
      name,
      email,
      password,
      team: finalTeamId, 
      role: userRole,
      // Optional: Auto-approve super_admin, require approval for others
      isApproved: userRole === 'super_admin' ? true : false 
    });

    // 5. Safe Response
    res.status(201).json({
      success: true,
      message: userRole === 'super_admin' 
        ? "Registration successful! Welcome to the Command Center."
        : `Registration successful! You have applied to join ${teamName}. Please wait for an administrator to approve your account.`
    });

  } catch (error) {
    // 🚨 HACK: Send the exact Mongoose error straight to the frontend!
    return res.status(500).json({ 
      success: false, 
      message: "Server Crash: " + error.message 
    });
  }
};

// ==========================================
// POST /api/auth/login
// ==========================================
exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // 🔄 SaaS Update: populate 'team' instead of 'club'
    const user = await User.findOne({ email }).select('+password').populate('team', 'name');
    
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }

    // Admins and SuperAdmins bypass the approval check
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
          team: user.team, // 🔄 SaaS Update
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
    
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    
    res.status(200).json({
      success: true,
      data: { user },
    });
  } catch (error) {
    next(error);
  }
};