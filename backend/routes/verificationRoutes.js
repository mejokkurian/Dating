const express = require('express');
const router = express.Router();
const { 
  createVerification, 
  getVerificationStatus, 
  updateVerificationStatus,
  verifyAccountWithSelfie,
  getVerificationStatusEndpoint,
  createLivenessSession,
  getLivenessSessionResults
} = require('../controllers/verificationController');
const { protect } = require('../middleware/authMiddleware');

router.post('/', protect, createVerification);
router.get('/status', protect, getVerificationStatusEndpoint);
router.post('/image-verify', protect, verifyAccountWithSelfie);

// AWS Liveness Routes
router.post('/liveness/session', protect, createLivenessSession);
router.get('/liveness/results/:sessionId', protect, getLivenessSessionResults);

router.get('/:userId', protect, getVerificationStatus);
router.put('/:userId', protect, updateVerificationStatus);

module.exports = router;
