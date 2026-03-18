const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { requireRole } = require('../middleware/roleCheck');
const adminController = require('../controllers/adminController');

router.get(
  '/stats',
  authenticate,
  requireRole('admin'),
  adminController.getStats
);

module.exports = router;