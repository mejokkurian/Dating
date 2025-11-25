const express = require('express');
const router = express.Router();
const { getProfile, updateProfile, saveOnboarding } = require('../controllers/userController');
const { protect } = require('../middleware/authMiddleware');

router.get('/profile', protect, getProfile);
router.put('/profile', protect, updateProfile);
router.post('/onboarding', protect, saveOnboarding);

module.exports = router;
