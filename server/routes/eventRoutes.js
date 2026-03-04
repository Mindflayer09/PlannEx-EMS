const express = require('express');
const router = express.Router();
const eventController = require('../controllers/eventController');
const authenticate = require('../middleware/auth');
const { requireRole } = require('../middleware/roleCheck');
const validate = require('../middleware/validate');
const { createEventSchema, updateEventSchema, changePhaseSchema } = require('../utils/validators');

// Public route (must be before authenticate middleware)
router.get('/public', eventController.getPublicEvents);

// Protected routes
router.use(authenticate);

router.get('/', eventController.getAllEvents);
router.get('/:id', eventController.getEventById);

router.post('/', requireRole('admin', 'sub-admin'), validate(createEventSchema), eventController.createEvent);
router.put('/:id', requireRole('admin', 'sub-admin'), validate(updateEventSchema), eventController.updateEvent);
router.delete('/:id', requireRole('admin'), eventController.deleteEvent);

router.patch('/:id/phase', requireRole('admin'), validate(changePhaseSchema), eventController.changePhase);
router.patch('/:id/finalize', requireRole('admin'), eventController.finalizeEvent);
router.post('/:id/media', requireRole('admin', 'sub-admin'), eventController.addMedia);

// --- NEW AI ROUTE ---
// Generate AI draft report from event data and completed tasks
router.post('/:id/generate-report', requireRole('admin', 'sub-admin'), eventController.generateEventReport);

module.exports = router;