const express = require('express');
const router = express.Router();
const eventController = require('../controllers/eventController');
const { authenticate, requireApproval, authorizeRoles } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { createEventSchema, updateEventSchema, changePhaseSchema } = require('../utils/validators');

// ==========================================
// PUBLIC ROUTES
// ==========================================
router.get('/public', eventController.getPublicEvents);
router.use(authenticate);
router.use(requireApproval); 

// --- GET Events ---
router.get('/', eventController.getAllEvents);
router.get('/:id', eventController.getEventById);
router.get('/:id/report', eventController.getEventReport);

// --- CUD (Create, Update, Delete) ---
router.post('/', authorizeRoles('admin', 'sub-admin'), validate(createEventSchema), eventController.createEvent);
router.put('/:id', authorizeRoles('admin', 'sub-admin'), validate(updateEventSchema), eventController.updateEvent);
router.delete('/:id', authorizeRoles('admin'), eventController.deleteEvent);

// --- Specific Actions ---
router.patch('/:id/phase', authorizeRoles('admin'), validate(changePhaseSchema), eventController.changePhase);
router.patch('/:id/finalize', authorizeRoles('admin'), eventController.finalizeEvent);
router.post('/:id/media', authorizeRoles('admin', 'sub-admin'), eventController.addMedia);

// --- NEW AI ROUTE ---
// Get media catalog from all approved tasks for report photo selection
router.get('/:id/media-catalog', authorizeRoles('admin'), eventController.getMediaCatalog);
// Generate AI draft report from event data and completed tasks
router.post('/:id/generate-report', authorizeRoles('admin'), eventController.generateEventReport);
// Generate social media content from selected photos and prompt (Admin only for publication)
router.post('/:id/generate-social-content', authorizeRoles('admin'), eventController.generateSocialMediaContent);

module.exports = router;