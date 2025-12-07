const express = require('express');
const router = express.Router();
const { 
  createVerification, 
  getVerificationStatus, 
  updateVerificationStatus,
  verifyAccountWithSelfie,
  getVerificationStatusEndpoint
} = require('../controllers/verificationController');
const { protect } = require('../middleware/authMiddleware');

router.post('/', protect, createVerification);
router.get('/status', protect, getVerificationStatusEndpoint);
router.post('/image-verify', protect, verifyAccountWithSelfie);
router.get('/:userId', protect, getVerificationStatus);
router.put('/:userId', protect, updateVerificationStatus);

module.exports = router;
