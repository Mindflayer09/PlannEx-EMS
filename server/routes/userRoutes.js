const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');

const { authenticate, authorizeRoles } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { updateRoleSchema } = require('../utils/validators');

// ==========================================
// GLOBAL PROTECTION
// ==========================================
router.use(authenticate);

// ==========================================
// ROUTES
// ==========================================

// ✅ FIX 1: Allow sub-admin to see the team directory
router.get(
  '/', 
  authorizeRoles('super_admin', 'admin', 'sub-admin'), 
  userController.getAllUsers
);

// ✅ FIX 2: Allow sub-admin to view specific member profiles
router.get(
  '/:id', 
  authorizeRoles('super_admin', 'admin', 'sub-admin'), 
  userController.getUserById
);

// ✅ FIX 3: Allow team-level admins to approve and delete members
// (The controller already ensures they can only do this for THEIR team)
router.patch(
  '/:id/approve', 
  authorizeRoles('super_admin', 'admin', 'sub-admin'), 
  userController.approveUser
);

router.delete(
  '/:id', 
  authorizeRoles('super_admin', 'admin', 'sub-admin'), 
  userController.deleteUser
);


// 🛠️ PLATFORM MANAGEMENT: Only Super Admins can edit core profile details or change roles
router.put(
  '/:id', 
  authorizeRoles('super_admin'), 
  userController.updateUser
);

router.patch(
  '/:id/role', 
  authorizeRoles('super_admin'),
  validate(updateRoleSchema), 
  userController.updateRole
);

module.exports = router;