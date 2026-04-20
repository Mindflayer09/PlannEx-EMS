const express = require('express');
const router = express.Router();
const { 
  requestRegistrationOTP,
  verifyRegistrationAndCreateUser,
  login,
  getMe,
  forgotPassword,
  resetPassword,
  googleAuth
} = require('../controllers/authController');
const { authenticate } = require('../middleware/auth'); 
const validate = require('../middleware/validate');
const { registerSchema, loginSchema } = require('../utils/validators');
const { authLimiter, otpLimiter } = require('../middleware/rateLimiter');

// ==========================================
// AUTHENTICATION ROUTES
// ==========================================
router.post('/send-otp', authLimiter, requestRegistrationOTP);
router.post('/verify-otp', otpLimiter, validate(registerSchema), verifyRegistrationAndCreateUser);
router.post('/login', authLimiter, validate(loginSchema), login);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password/:token', resetPassword);
router.post('/google', googleAuth);
router.get('/me', authenticate, getMe);

module.exports = router;