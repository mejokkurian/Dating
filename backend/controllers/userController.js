const User = require('../models/User');
const Match = require('../models/Match');
const Interaction = require('../models/Interaction');
const pushNotificationService = require('../services/pushNotificationService');

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

// @desc    Get user by ID
// @route   GET /api/users/:id
// @access  Private
exports.getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password');
    
    if (user) {
      res.json(user);
    } else {
      res.status(404).json({ message: 'User not found' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get potential matches
// @route   GET /api/users/matches
// @access  Private
exports.getPotentialMatches = async (req, res) => {
  try {
    const currentUserId = req.user._id;

    // Find all matches (active or pending) involving the current user
    const existingMatches = await Match.find({
      $or: [{ user1Id: currentUserId }, { user2Id: currentUserId }],
    });

    // Get IDs of users to exclude
    const excludedUserIds = existingMatches.map(match => 
      match.user1Id.toString() === currentUserId.toString() 
        ? match.user2Id 
        : match.user1Id
    );

    // Also exclude users we have already interacted with (swiped)
    const interactions = await Interaction.find({ userId: currentUserId });
    const interactedUserIds = interactions.map(i => i.targetId);

    // Combine all exclusions
    const allExcludedIds = [...new Set([
      currentUserId, 
      ...excludedUserIds, 
      ...interactedUserIds
    ])];
    
    // Get all users except excluded ones who have completed onboarding
    const users = await User.find({
      _id: { $nin: allExcludedIds },
      onboardingCompleted: true,
      displayName: { $exists: true },
      age: { $exists: true }
    })
    .select('-password')
    .limit(50);

    // Format response
    const matches = users.map(user => ({
      id: user._id,
      _id: user._id,
      displayName: user.displayName,
      age: user.age,
      gender: user.gender,
      location: user.location || 'Unknown Location',
      bio: user.bio || 'No bio available',
      occupation: user.occupation || 'Undisclosed',
      height: user.height,
      photos: user.photos || [],
      interests: user.interests || [],
      relationshipExpectations: user.relationshipExpectations || 'Open to possibilities',
      isVerified: user.isVerified || false,
      isPremium: user.isPremium || false,
      distance: Math.floor(Math.random() * 20) + 1 // Mock distance for now
    }));

    res.json(matches);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Register/Update push notification token
// @route   POST /api/users/push-token
// @access  Private
exports.registerPushToken = async (req, res) => {
  try {
    const { token, deviceId } = req.body;

    if (!token || typeof token !== 'string') {
      return res.status(400).json({ message: 'Push token is required' });
    }

    // Validate token format
    if (!pushNotificationService.validateToken(token)) {
      return res.status(400).json({ message: 'Invalid push token format' });
    }

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Add or update push token
    await user.addPushToken(token, deviceId);

    res.json({ 
      message: 'Push token registered successfully',
      tokenCount: user.pushTokens.length
    });
  } catch (error) {
    console.error('Error registering push token:', error);
    res.status(500).json({ message: error.message });
  }
};
