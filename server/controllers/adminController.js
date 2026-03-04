const User = require('../models/User');
const Event = require('../models/Event');
const Task = require('../models/Task');

exports.getStats = async (req, res, next) => {
  try {
    const clubId = req.headers['x-club-id'];

    // 🔹 1. Club header required
    if (!clubId) {
      return res.status(400).json({
        success: false,
        message: 'Club ID is required',
      });
    }

    // 🔹 2. Ensure user exists (from authenticate middleware)
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Not authorized',
      });
    }

    // 🔹 3. Extract user club safely (handles populated & non-populated)
    const userClubId = req.user.club?._id
      ? req.user.club._id.toString()
      : req.user.club?.toString();

    if (!userClubId) {
      return res.status(403).json({
        success: false,
        message: 'User has no club assigned',
      });
    }

    // 🔹 4. Ensure user belongs to this club
    if (userClubId !== clubId) {
      return res.status(403).json({
        success: false,
        message: 'Access denied to this club',
      });
    }

    // 🔹 5. Ensure only admin can access
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Admin access only',
      });
    }

    // 🔹 6. Get stats
    const totalUsers = await User.countDocuments({ club: clubId });

    const pendingApprovals = await User.countDocuments({
      club: clubId,
      isApproved: false,
      role: { $in: ['sub-admin', 'volunteer'] },
    });

    const totalEvents = await Event.countDocuments({ club: clubId });

    const totalTasks = await Task.countDocuments({ club: clubId });

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
