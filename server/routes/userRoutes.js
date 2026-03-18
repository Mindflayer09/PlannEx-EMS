const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');

// ✅ Import only the names you defined in your authMiddleware
const { authenticate, authorizeRoles } = require('../middleware/auth');

const validate = require('../middleware/validate');
const { updateRoleSchema } = require('../utils/validators');

// ==========================================
// GLOBAL PROTECTION
// ==========================================
// Every route below this line requires a valid logged-in user
router.use(authenticate);

// ==========================================
// ROUTES
// ==========================================

// (Admin view is usually filtered by team in the controller)
router.get('/', authorizeRoles('super_admin', 'admin'), userController.getAllUsers);

// 📖 READ SINGLE: View specific user profile
router.get('/:id', authorizeRoles('super_admin', 'admin'), userController.getUserById);

// 🛠️ PLATFORM MANAGEMENT: Only Super Admins can perform these actions
router.put('/:id', authorizeRoles('super_admin'), userController.updateUser);
router.delete('/:id', authorizeRoles('super_admin'), userController.deleteUser);

// 🔑 ROLE MANAGEMENT: Update a user's role (Super Admin only)
router.patch(
  '/:id/role', 
  authorizeRoles('super_admin'), 
  validate(updateRoleSchema), 
  userController.updateRole
);

router.patch('/:id/approve', authorizeRoles('super_admin'), userController.approveUser);

module.exports = router;