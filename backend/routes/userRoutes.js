const express = require('express');
const router = express.Router();
const { 
  getProfile, 
  updateProfile, 
  saveOnboarding,
  getUserById,
  getPotentialMatches
} = require('../controllers/userController');
const { protect } = require('../middleware/authMiddleware');

router.get('/profile', protect, getProfile);
router.get('/profile/:id', protect, getUserById);
router.put('/profile', protect, updateProfile);
router.post('/onboarding', protect, saveOnboarding);
router.get('/matches', protect, getPotentialMatches);

module.exports = router;

