const Team = require('../models/Team'); 
const User = require('../models/User');
const Event = require('../models/Event');
const Task = require('../models/Task');
const Report = require('../models/Report');

// GET /api/teams
// Fetches all active teams for the "Discover Organizations" page
exports.getAllTeams = async (req, res, next) => {
  try {
    // Only return active teams to the public/users
    const teams = await Team.find({ status: 'active' }).sort({ name: 1 });
    res.json({ success: true, data: { teams } });
  } catch (error) {
    next(error);
  }
};

// GET /api/teams/:id
// Fetches a specific team and populates the members so we can see the Director, Secretary, etc.
exports.getTeamById = async (req, res, next) => {
  try {
    const team = await Team.findById(req.params.id)
      .populate('members.user', 'name email avatar'); // Populating member details
    
    if (!team) {
      return res.status(404).json({ success: false, message: 'Team not found' });
    }
    
    res.json({ success: true, data: { team } });
  } catch (error) {
    next(error);
  }
};

// ==========================================
//  NEW SAAS FEATURES (Super Admin & Team Admins)
// ==========================================

// POST /api/teams
// Creates a new Organization/Team from the Admin Dashboard
exports.createTeam = async (req, res, next) => {
  try {
    const { name, description, logo } = req.body;
    
    const newTeam = await Team.create({
      name,
      description,
      logo,
      status: 'active'
    });

    res.status(201).json({ success: true, message: 'Team created successfully', data: { team: newTeam } });
  } catch (error) {
    next(error);
  }
};

// POST /api/teams/:id/members
// Assigns a user to a team with a specific Job Title (Position) and Access Level
exports.addTeamMember = async (req, res, next) => {
  try {
    const { userId, position, accessLevel } = req.body;
    const teamId = req.params.id;

    const team = await Team.findById(teamId);
    if (!team) return res.status(404).json({ success: false, message: 'Team not found' });

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    // Prevent duplicate entries
    const isAlreadyMember = team.members.some(member => member.user.toString() === userId);
    if (isAlreadyMember) {
      return res.status(400).json({ success: false, message: 'User is already in this team' });
    }

    // Add member to the Team's sub-document array
    team.members.push({
      user: userId,
      position: position || 'Member', 
      accessLevel: accessLevel || 'member' 
    });

    await team.save();

    // Link the User back to the Team
    user.team = teamId;
    await user.save();

    res.json({ success: true, message: `${position} added successfully to ${team.name}` });
  } catch (error) {
    next(error);
  }
};

exports.updateTeamStatus = async (req, res, next) => {
  try {
    const { status } = req.body; // 'active' or 'archived'
    
    const team = await Team.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true, runValidators: true }
    );

    if (!team) return res.status(404).json({ success: false, message: 'Team not found' });

    res.json({ success: true, message: `Team marked as ${status}`, data: { team } });
  } catch (error) {
    next(error);
  }
};

exports.updateTeam = async (req, res, next) => {
  try {
    const { name, description, logo } = req.body;

    const team = await Team.findById(req.params.id);
    if (!team) {
      return res.status(404).json({ success: false, message: 'Team not found' });
    }

    if (name !== undefined) team.name = name;
    if (description !== undefined) team.description = description;
    if (logo !== undefined) team.logo = logo;

    await team.save();

    res.json({ success: true, message: 'Team updated successfully', data: { team } });
  } catch (error) {
    next(error);
  }
};

exports.deleteTeam = async (req, res, next) => {
  try {
    const team = await Team.findById(req.params.id);
    if (!team) {
      return res.status(404).json({ success: false, message: 'Team not found' });
    }

    // Delete all pending approval users for this organization
    await User.deleteMany({ team: team._id, isApproved: false });

    // Unlink approved members from the deleted organization
    await User.updateMany(
      { team: team._id, isApproved: true },
      {
        $unset: { team: '' },
        $set: { isApproved: false }
      }
    );

    // Clean up related team resources to avoid orphaned documents
    await Task.deleteMany({ team: team._id });
    await Event.deleteMany({ team: team._id });
    await Report.deleteMany({ team: team._id });

    await Team.findByIdAndDelete(team._id);

    res.json({ success: true, message: 'Team deleted successfully' });
  } catch (error) {
    next(error);
  }
};

exports.approvePendingUser = async (req, res, next) => {
  try {
    const { teamId, userId } = req.params;
    const { position, accessLevel } = req.body;

    // 1. 🛡️ Check if the person making the request is an Admin of this Team (or a Super Admin)
    // (Assuming you import the verifyTeamAdmin helper here)
    const isTeamAdmin = await verifyTeamAdmin(teamId, req.user._id);
    if (!isTeamAdmin && req.user.role !== 'super_admin') {
      return res.status(403).json({ success: false, message: 'Not authorized to approve members.' });
    }

    // 2. Find and approve the user
    const user = await User.findById(userId);
    if (!user || user.team.toString() !== teamId) {
      return res.status(404).json({ success: false, message: 'Pending user not found for this team.' });
    }

    user.isApproved = true;
    await user.save();

    // 3. Officially add them to the Team's member array with their new title
    const team = await Team.findById(teamId);
    team.members.push({
      user: userId,
      position: position || 'Volunteer',
      accessLevel: accessLevel || 'member'
    });
    await team.save();

    res.json({ success: true, message: `${user.name} has been approved and added to the team!` });
  } catch (error) {
    next(error);
  }
};