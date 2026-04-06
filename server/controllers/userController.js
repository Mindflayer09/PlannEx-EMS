const User = require('../models/User');
// ✅ Ensure these are imported correctly
const { notifyUserApproved, notifyUserDeleted } = require('../services/notificationService');

const isSuperAdmin = (req) => req.user.role === 'super_admin';

// 🛠️ NEW HELPER: Safely extracts string ID whether the team is populated or not
const getTeamId = (teamData) => {
  if (!teamData) return null;
  return teamData._id ? teamData._id.toString() : teamData.toString();
};

exports.getAllUsers = async (req, res, next) => {
  try {
    let query = {};
    if (!isSuperAdmin(req)) {
      const requesterTeamId = getTeamId(req.user.team);
      if (!requesterTeamId) return res.status(403).json({ success: false, message: "No organization associated" });
      query.team = requesterTeamId;
    }

    const users = await User.find(query)
      .populate('team', 'name') 
      .select('-password')
      .sort({ createdAt: -1 });

    res.status(200).json({ success: true, count: users.length, users });
  } catch (error) { next(error); }
};

exports.getUserById = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id).populate('team', 'name');
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    
    // ✅ FIX: Safe ID extraction
    if (!isSuperAdmin(req) && getTeamId(user.team) !== getTeamId(req.user.team)) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }
    
    res.json({ success: true, data: { user } });
  } catch (error) { next(error); }
};

exports.updateUser = async (req, res, next) => {
  try {
    const { name, email, team } = req.body;
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    // ✅ FIX: Safe ID extraction
    if (!isSuperAdmin(req) && getTeamId(user.team) !== getTeamId(req.user.team)) {
      return res.status(403).json({ success: false, message: 'Permission denied' });
    }

    if (name) user.name = name;
    if (email) user.email = email;
    if (team && isSuperAdmin(req)) user.team = team; 
    
    await user.save();
    res.json({ success: true, message: 'User updated successfully', data: { user } });
  } catch (error) { next(error); }
};

// 🟢 FIX 1: Awaiting the notification and handling the response
exports.approveUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id).populate('team');
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    // ✅ FIX: Compare exact string IDs
    const targetTeamId = getTeamId(user.team);
    const requesterTeamId = getTeamId(req.user.team);

    const canApprove = isSuperAdmin(req) || (targetTeamId === requesterTeamId && targetTeamId !== null);
    if (!canApprove) return res.status(403).json({ success: false, message: 'Permission denied' });

    user.isApproved = true;
    await user.save();
    try {
      console.log(` Attempting to notify approved user: ${user.email}`);
      notifyUserApproved(user);
    } catch (err) {
      // This will now catch the network error specifically
      console.error('❌ Controller Email Error:', err.message);
    }

    res.json({ success: true, message: 'User approved successfully' });
  } catch (error) { next(error); }
};

exports.updateRole = async (req, res, next) => {
  try {
    const { role } = req.body;
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    if (!isSuperAdmin(req)) return res.status(403).json({ success: false, message: 'Only Super Admin can change roles' });

    user.role = role;
    await user.save();
    res.json({ success: true, message: 'Role updated', data: { user } });
  } catch (error) { next(error); }
};

exports.deleteUser = async (req, res, next) => {
  try {
    const targetUser = await User.findById(req.params.id).populate('team');
    if (!targetUser) return res.status(404).json({ success: false, message: 'User not found' });

    const requester = req.user;

    // 🏆 Define the Hierarchy Power Levels
    const rolePower = {
      'super_admin': 4,
      'admin': 3,
      'sub-admin': 2,
      'user': 1,      // Or 'volunteer'
      'volunteer': 1
    };

    const requesterPower = rolePower[requester.role] || 0;
    const targetPower = rolePower[targetUser.role] || 0;

    // 🛡️ SECURITY CHECK 1: Hierarchy Rule
    if (requesterPower <= targetPower) {
      return res.status(403).json({ 
        success: false, 
        message: `Permission denied: A ${requester.role} cannot delete a ${targetUser.role}` 
      });
    }

    // 🛡️ SECURITY CHECK 2: Team Isolation
    // ✅ FIX: Compare exact string IDs
    const targetTeamId = getTeamId(targetUser.team);
    const requesterTeamId = getTeamId(requester.team);
    
    const isSameTeam = targetTeamId === requesterTeamId;
    if (requester.role !== 'super_admin' && !isSameTeam) {
      return res.status(403).json({ success: false, message: 'Access denied: User belongs to another organization' });
    }

    // 📧 Notification
    try {
      if (typeof notifyUserDeleted === 'function') await notifyUserDeleted(targetUser);
    } catch (err) {
      console.error('❌ Deletion Email Error:', err.message);
    }

    await User.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'User deleted successfully' });

  } catch (error) { 
    next(error); 
  }
};