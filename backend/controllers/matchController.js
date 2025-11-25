const axios = require('axios');
const User = require('../models/User');

// Matching Engine URL (Django)
const MATCHING_ENGINE_URL = process.env.MATCHING_ENGINE_URL || 'http://localhost:8000/api';

// @desc    Get potential matches
// @route   GET /api/matches
// @access  Private
exports.getMatches = async (req, res) => {
  try {
    // Try to get recommendations from Python Matching Engine
    try {
      const response = await axios.get(`${MATCHING_ENGINE_URL}/recommendations/`, {
        params: { user_id: req.user._id.toString() }
      });
      
      if (response.data && response.data.length > 0) {
        return res.json(response.data);
      }
    } catch (engineError) {
      console.error('Matching Engine Error:', engineError.message);
      // Fallback to basic logic if engine is down
    }

    // Fallback: Basic matching logic
    console.log('Falling back to basic matching...');
    const matches = await User.find({ 
      _id: { $ne: req.user._id }
    }).limit(50);

    res.json(matches);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Record interaction (Like/Pass)
// @route   POST /api/matches/interaction
// @access  Private
exports.recordInteraction = async (req, res) => {
  try {
    const { targetId, action } = req.body; // action: LIKE, PASS, SUPERLIKE

    // Send to Matching Engine for ELO update
    try {
      await axios.post(`${MATCHING_ENGINE_URL}/interaction/`, {
        actor_id: req.user._id.toString(),
        target_id: targetId,
        action: action
      });
    } catch (engineError) {
      console.error('Matching Engine Interaction Error:', engineError.message);
      // Don't fail the request if engine is down, just log it
    }

    res.json({ message: 'Interaction recorded' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
