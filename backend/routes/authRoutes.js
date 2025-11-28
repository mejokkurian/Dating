const express = require('express');
const router = express.Router();
const { 
  register, 
  login, 
  socialLogin, 
  sendPhoneOTP, 
  verifyPhoneOTP,
  googleSignIn,
  appleSignIn,
  requestPasswordReset,
  confirmPasswordReset
} = require('../controllers/authController');

router.post('/register', register);
router.post('/login', login);
router.post('/social', socialLogin);
router.post('/phone/send', sendPhoneOTP);
router.post('/phone/verify', verifyPhoneOTP);
router.post('/google', googleSignIn);
router.post('/apple', appleSignIn);
router.post('/reset-password', requestPasswordReset);
router.post('/reset-password/confirm', confirmPasswordReset);

module.exports = router;

