const User = require('../models/User');

const { notifyUserApproved, notifyUserDeleted } = require('../services/notificationService');

// GET /api/users
exports.getAllUsers = async (req, res, next) => {
  try {
    const { isApproved } = req.query;

    const filter = {
      club: req.user.club, // Only same club users
    };

    if (isApproved !== undefined) {
      filter.isApproved = isApproved === 'true';
    }

    const users = await User.find(filter).populate('club', 'name');

    res.json({
      success: true,
      data: { users },
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/users/:id
exports.getUserById = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id).populate('club', 'name description logo');
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    res.json({ success: true, data: { user } });
  } catch (error) {
    next(error);
  }
};

// PATCH /api/users/:id/approve
exports.approveUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    // Prevent cross-club approval
    if (user.club.toString() !== req.user.club.toString()) {
      return res.status(403).json({
        success: false,
        message: 'You cannot approve users from another club',
      });
    }

    // Prevent approving yourself
    if (user._id.toString() === req.user._id.toString()) {
      return res.status(400).json({
        success: false,
        message: 'You cannot approve yourself',
      });
    }

    user.isApproved = true;
    await user.save();

    // 🔥 NEW: Trigger approval email
    try {
      await notifyUserApproved(user);
    } catch (emailErr) {
      console.error('Approval email failed to send:', emailErr);
    }

    res.json({
      success: true,
      message: 'User approved successfully',
      data: { user },
    });
  } catch (error) {
    next(error);
  }
};

// PATCH /api/users/:id/role
exports.updateRole = async (req, res, next) => {
  try {
    const { role } = req.body;

    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    // Prevent cross-club modification
    if (user.club.toString() !== req.user.club.toString()) {
      return res.status(403).json({
        success: false,
        message: 'You cannot modify users from another club',
      });
    }

    // Prevent changing your own role
    if (user._id.toString() === req.user._id.toString()) {
      return res.status(400).json({
        success: false,
        message: 'You cannot change your own role',
      });
    }

    // Prevent multiple admins per club
    if (role === 'admin') {
      const existingAdmin = await User.findOne({
        club: req.user.club,
        role: 'admin',
      });

      if (existingAdmin) {
        return res.status(400).json({
          success: false,
          message: 'This club already has an admin',
        });
      }
    }

    // Optional: Prevent modifying another admin
    if (user.role === 'admin') {
      return res.status(400).json({
        success: false,
        message: 'You cannot change another admin’s role',
      });
    }

    user.role = role;
    await user.save();

    res.json({
      success: true,
      message: 'Role updated successfully',
      data: { user },
    });
  } catch (error) {
    next(error);
  }
};

// PUT /api/users/:id
exports.updateUser = async (req, res, next) => {
  try {
    const { name, email, club } = req.body;
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    if (name) user.name = name;
    if (email) user.email = email;
    if (club) user.club = club;
    await user.save();

    res.json({ success: true, data: { user } });
  } catch (error) {
    next(error);
  }
};

// DELETE /api/users/:id
exports.deleteUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    // Prevent deleting yourself
    if (user._id.toString() === req.user._id.toString()) {
      return res.status(400).json({
        success: false,
        message: 'You cannot delete your own account',
      });
    }

    // Prevent cross-club deletion
    if (user.club.toString() !== req.user.club.toString()) {
      return res.status(403).json({
        success: false,
        message: 'You cannot delete users from another club',
      });
    }

    // Prevent deleting another admin
    if (user.role === 'admin') {
      return res.status(400).json({
        success: false,
        message: 'You cannot delete another admin',
      });
    }

    await User.findByIdAndDelete(req.params.id);

    try {
      await notifyUserDeleted(user);
    } catch (emailErr) {
      console.error('Deletion email failed to send:', emailErr);
    }

    res.json({
      success: true,
      message: 'User deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};