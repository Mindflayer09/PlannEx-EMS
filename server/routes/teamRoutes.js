const express = require('express');
const router = express.Router();
const teamController = require('../controllers/teamController');
const { authenticate, requireApproval, authorizeRoles } = require('../middleware/auth'); 
const { ROLES } = require('../utils/constants');

// ==========================================
// PUBLIC ROUTES
// ==========================================
router.get('/', teamController.getAllTeams);
router.get('/:id', teamController.getTeamById);

// ==========================================
// PROTECTED ROUTES (Platform Management)
// ==========================================
router.use(authenticate);

// 2. Check VIP Status (Must not be pending)
router.use(requireApproval);

// 3. Strictly restrict to Super Admins only
router.use(authorizeRoles(ROLES.SUPER_ADMIN)); 

// --- Management Endpoints ---
router.post('/', teamController.createTeam);
router.post('/:id/members', teamController.addTeamMember);
router.patch('/:id/status', teamController.updateTeamStatus);
router.patch('/:id', teamController.updateTeam);
router.delete('/:id', teamController.deleteTeam);

module.exports = router;