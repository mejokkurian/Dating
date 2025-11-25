const express = require('express');
const router = express.Router();
const { register, login, socialLogin, sendPhoneOTP, verifyPhoneOTP } = require('../controllers/authController');

router.post('/register', register);
router.post('/login', login);
router.post('/social', socialLogin);
router.post('/phone/send', sendPhoneOTP);
router.post('/phone/verify', verifyPhoneOTP);

module.exports = router;
