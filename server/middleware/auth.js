const jwt = require('jsonwebtoken');
const User = require('../models/User');

// ==========================================
// 1. BASE AUTHENTICATION (The "ID Checker")
// ==========================================
// This ONLY checks if the token is valid. 
// Use this on `/api/auth/me` so the frontend can load the user profile and see `isApproved: false`.
const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, message: 'No token provided' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await User.findById(decoded.id).populate('team');
    
    if (!user) {
      return res.status(401).json({ success: false, message: 'User no longer exists' });
    }

    // Attach user to the request and move on. NO approval checks here!
    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ success: false, message: 'Session expired. Please login again.' });
    }
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ success: false, message: 'Invalid security token.' });
    }
    next(error);
  }
};

// ==========================================
// 2. STRICT APPROVAL CHECK (The "VIP Bouncer")
// ==========================================
// Use this on your secure data routes (e.g., getting events, creating tasks, etc.)
// Route usage example: router.get('/events', authenticate, requireApproval, getEvents)
const requireApproval = (req, res, next) => {
  // 1. Super Admins bypass everything
  if (req.user && req.user.platformRole === 'SUPER_ADMIN') {
    return next();
  }

  // 2. Check if the User account itself is approved
  if (!req.user.isApproved) {
    return res.status(403).json({
      success: false,
      message: 'Your account is pending approval by a platform administrator.',
    });
  }

  // 3. Multi-Tenant Check: Is their Organization active?
  if (req.user.team && req.user.team.status !== 'active') {
    return res.status(403).json({
      success: false,
      message: `Access denied. The organization "${req.user.team.name}" is currently ${req.user.team.status}.`,
    });
  }

  next();
};

// ==========================================
// 3. ROLE AUTHORIZATION
// ==========================================
const authorizeRoles = (...roles) => {
  return (req, res, next) => {
    // Super Admins automatically bypass team-level role restrictions
    if (req.user && req.user.platformRole === 'SUPER_ADMIN') {
      return next();
    }

    // Check if the user's role exists in the allowed list
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ 
        success: false, 
        message: `Forbidden: Your role (${req.user?.role || 'Guest'}) does not have permission.` 
      });
    }
    next();
  };
};

module.exports = {
  authenticate,
  requireApproval,
  authorizeRoles
};