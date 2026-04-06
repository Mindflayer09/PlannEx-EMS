const jwt = require('jsonwebtoken');
const User = require('../models/User');

const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, message: 'No token provided' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // ✅ Added .populate('team') to check organization status
    const user = await User.findById(decoded.id).populate('team');
    
    if (!user) {
      return res.status(401).json({ success: false, message: 'User no longer exists' });
    }
    if (user.platformRole === 'SUPER_ADMIN') {
      req.user = user;
      return next();
    }

    // 2. Check if the User account itself is approved
    if (!user.isApproved) {
      return res.status(403).json({
        success: false,
        message: 'Your account is pending approval by a platform administrator.',
      });
    }

    // 3. Multi-Tenant Check: Is their Organization active?
    // If you archive a team, no one from that team can log in.
    if (user.team && user.team.status !== 'active') {
      return res.status(403).json({
        success: false,
        message: `Access denied. The organization "${user.team.name}" is currently ${user.team.status}.`,
      });
    }

    req.user = user;
    next();
  } catch (error) {
    // Graceful Error Handling
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ success: false, message: 'Session expired. Please login again.' });
    }
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ success: false, message: 'Invalid security token.' });
    }
    next(error);
  }
};

const authorizeRoles = (...roles) => {
  return (req, res, next) => {
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
  authorizeRoles
};