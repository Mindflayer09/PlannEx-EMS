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

    // 🔹 2. Smart Team ID Extraction
    // Fallback chain: Check new header -> Check old header -> Just use the user's assigned team
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

    // 🔹 4. Build the Query Filter
    // If it's a Super Admin and they didn't specify a team, fetch stats for the WHOLE platform.
    // Otherwise, fetch stats just for the specific team.
    const queryFilter = targetTeamId ? { team: targetTeamId } : {};

    // 🔹 5. Get Stats (Changed all 'club' references to 'team')
    const totalUsers = await User.countDocuments(queryFilter);

    const pendingApprovals = await User.countDocuments({
      ...queryFilter,
      isApproved: false,
      // Removed the strict role check here in case you add new roles later, 
      // it's safer to just count anyone who isn't approved.
    });

    const totalEvents = await Event.countDocuments(queryFilter);

    // Note: Assuming your Task model also references the team directly. 
    // If Tasks only reference Events, you might need to adjust this.
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