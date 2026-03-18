const express = require('express');
const reportController = require('../controllers/reportController');
const { authenticate, authorizeRoles } = require('../middleware/auth');

const router = express.Router();

router.get('/public', reportController.getPublicReports);
router.use(authenticate);
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