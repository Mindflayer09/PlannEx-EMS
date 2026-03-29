const User = require('../models/User');
const Event = require('../models/Event');
const Task = require('../models/Task');

exports.getStats = async (req, res, next) => {
  try {
    // 🔹 1. Ensure user exists
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Not authorized' });
    }

    const isSuperAdmin = req.user.role === 'super_admin';
    const targetTeamId = req.headers['x-team-id'] 
      || req.headers['x-club-id'] 
      || (req.user.team ? req.user.team.toString() : null);

    // 🔹 3. Super Admin & Admin Validation
    if (!isSuperAdmin) {
      if (!targetTeamId) {
        return res.status(403).json({ success: false, message: 'User has no organization assigned' });
      }

      const userTeamId = req.user.team?._id 
        ? req.user.team._id.toString() 
        : req.user.team?.toString();

      if (userTeamId !== targetTeamId.toString()) {
        return res.status(403).json({ success: false, message: 'Access denied to this organization' });
      }

      if (req.user.role !== 'admin') {
        return res.status(403).json({ success: false, message: 'Admin access only' });
      }
    }

    const queryFilter = targetTeamId ? { team: targetTeamId } : {};
    const totalUsers = await User.countDocuments(queryFilter);

    const pendingApprovals = await User.countDocuments({
      ...queryFilter,
      isApproved: false,
    });

    const totalEvents = await Event.countDocuments(queryFilter);
    const totalTasks = await Task.countDocuments(queryFilter);

    return res.json({
      success: true,
      data: {
        totalUsers,
        pendingApprovals,
        totalEvents,
        totalTasks,
      },
    });

  } catch (error) {
    next(error);
  }
};