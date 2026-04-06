const express = require('express');
const router = express.Router();
const { requestRegistrationOTP,verifyRegistrationAndCreateUser,login,getMe,forgotPassword,resetPassword,googleAuth} = require('../controllers/authController');
const { authenticate } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { registerSchema, loginSchema } = require('../utils/validators');
const { authLimiter } = require('../middleware/rateLimiter');

router.post('/send-otp', authLimiter, requestRegistrationOTP);
router.post('/verify-otp', validate(registerSchema), verifyRegistrationAndCreateUser);
router.post('/login', authLimiter, validate(loginSchema), login);
router.get('/me', authenticate, getMe);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password/:token', resetPassword);
router.post('/google', googleAuth);
module.exports = router;