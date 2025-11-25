const User = require('../models/User');

// @desc    Get user profile
// @route   GET /api/users/profile
// @access  Private
exports.getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (user) {
      res.json(user);
    } else {
      res.status(404).json({ message: 'User not found' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update user profile
// @route   PUT /api/users/profile
// @access  Private
exports.updateProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    if (user) {
      // Update fields
      Object.keys(req.body).forEach(key => {
        user[key] = req.body[key];
      });

      const updatedUser = await user.save();
      res.json(updatedUser);
    } else {
      res.status(404).json({ message: 'User not found' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Save onboarding progress
// @route   POST /api/users/onboarding
// @access  Private
exports.saveOnboarding = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    if (user) {
      // Update fields from onboarding
      Object.keys(req.body).forEach(key => {
        user[key] = req.body[key];
      });
      
      if (req.body.isComplete) {
        user.onboardingCompleted = true;
      }

      const updatedUser = await user.save();
      res.json(updatedUser);
    } else {
      res.status(404).json({ message: 'User not found' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
