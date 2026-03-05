const express = require('express');
const reportController = require('../controllers/reportController');
const { requireRole } = require('../middleware/roleCheck');

const router = express.Router();

// Public endpoints
router.get('/public', reportController.getPublicReports);

// Protected endpoints
// IMPORTANT: Specific routes like /event/:eventId must come before generic routes like /:id
router.get('/event/:eventId', requireRole('admin', 'sub-admin'), reportController.getReportByEventId);
router.get('/:id', requireRole('admin', 'sub-admin'), reportController.getReportById);
router.put('/:id', requireRole('admin', 'sub-admin'), reportController.updateReport);
router.delete('/:id', requireRole('admin', 'sub-admin'), reportController.deleteReport);

module.exports = router;
