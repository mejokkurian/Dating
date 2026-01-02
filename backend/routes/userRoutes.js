const express = require('express');
const router = express.Router();
const { 
  getProfile, 
  updateProfile, 
  saveOnboarding,
  getUserById,
  getPotentialMatches,
  registerPushToken,
  sendTestNotification
} = require('../controllers/userController');
const { protect } = require('../middleware/authMiddleware');

router.get('/profile', protect, getProfile);
router.get('/profile/:id', protect, getUserById);
router.put('/profile', protect, updateProfile);
router.post('/onboarding', protect, saveOnboarding);
router.get('/matches', protect, getPotentialMatches);
router.post('/push-token', protect, registerPushToken);
router.post('/test-notification', protect, sendTestNotification);

module.exports = router;

