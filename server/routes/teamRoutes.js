const express = require('express');
const router = express.Router();
const teamController = require('../controllers/teamController');

// Import your auth middleware (adjust the path if necessary)
const { authenticate } = require('../middleware/auth'); 
const { authorizeRoles } = require('../middleware/auth'); 
const { ROLES } = require('../utils/constants');
router.get('/', teamController.getAllTeams);
router.get('/:id', teamController.getTeamById);
router.use(authenticate);

// 2. Require the user to be a SUPER_ADMIN
router.use(authorizeRoles(ROLES.SUPER_ADMIN)); 

// 3. The new management endpoints
router.post('/', teamController.createTeam);
router.post('/:id/members', teamController.addTeamMember);
router.patch('/:id/status', teamController.updateTeamStatus);

module.exports = router;