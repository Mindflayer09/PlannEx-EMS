const express = require('express');
const reportController = require('../controllers/reportController'); // Ensure the path is correct
const { authenticate, authorizeRoles } = require('../middleware/auth'); // Ensure the path is correct

const router = express.Router();

// Public Routes
router.get('/public', reportController.getPublicReports);

// Apply authentication middleware to all routes below this line
router.use(authenticate);

// ==========================================
// 🤖 AI Generation Route (NEW)
// ==========================================
router.post(
  '/event/:eventId/generate',
  authorizeRoles('super_admin', 'admin', 'sub-admin'),
  reportController.generateReportContent
);

// ==========================================
// Standard CRUD Routes
// ==========================================
router.get(
  '/event/:eventId', 
  authorizeRoles('super_admin', 'admin', 'sub-admin'),
  reportController.getReportByEventId
);

router.get(
  '/:id', 
  authorizeRoles('super_admin', 'admin', 'sub-admin'), 
  reportController.getReportById
);

router.put(
  '/:id', 
  authorizeRoles('super_admin', 'admin', 'sub-admin'), 
  reportController.updateReport
);

router.delete(
  '/:id', 
  authorizeRoles('super_admin', 'admin', 'sub-admin'), 
  reportController.deleteReport
);

module.exports = router;