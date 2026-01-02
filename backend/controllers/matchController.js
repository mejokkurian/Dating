const axios = require("axios");
const User = require("../models/User");

// Matching Engine URL (Django)
const MATCHING_ENGINE_URL =
  process.env.MATCHING_ENGINE_URL || "http://localhost:8000/api";

// @desc    Get potential matches
// @route   GET /api/matches
// @access  Private
exports.getMatches = async (req, res) => {
  try {
    // Try to get recommendations from Python Matching Engine
    try {
      const response = await axios.get(
        `${MATCHING_ENGINE_URL}/recommendations/`,
        {
          params: { user_id: req.user._id.toString() },
        }
      );

      if (response.data && response.data.length > 0) {
        return res.json(response.data);
      }
    } catch (engineError) {
      console.error("Matching Engine Error:", engineError.message);
      // Fallback to basic logic if engine is down
    }

    // Fallback: Basic matching logic
    console.log("Falling back to basic matching...");
    const matches = await User.find({
      _id: { $ne: req.user._id },
    }).limit(50);

    res.json(matches);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get user's actual matches (people they've matched with)
// @route   GET /api/matches/my-matches
// @access  Private
exports.getMyMatches = async (req, res) => {
  try {
    const Match = require("../models/Match");
    const Message = require("../models/Message");

    // Find all matches where user is either user1 or user2 (including pending)
    const matches = await Match.find({
      $or: [{ user1Id: req.user._id }, { user2Id: req.user._id }],
      status: { $in: ["pending", "active"] },
    })
      .populate(
        "user1Id",
        "displayName photos age bio occupation location height interests relationshipExpectations isVerified isPremium gender education drinking smoking drugs"
      )
      .populate(
        "user2Id",
        "displayName photos age bio occupation location height interests relationshipExpectations isVerified isPremium gender education drinking smoking drugs"
      )
      .sort({ lastMessageAt: -1, createdAt: -1 });

    // Format the response to show the other user
    const matchesWithLastMessage = await Promise.all(
      matches.map(async (match) => {
        const conversationId = match.getConversationId();
        
        // Populate user details - check if user1 is 'me' or 'them'
        const otherUser = match.user1Id._id.toString() === req.user._id.toString() 
          ? match.user2Id 
          : match.user1Id;

        // Get last message (only for active matches)
        let lastMessage = null;
        let unreadCount = 0;

        console.log(`Debug Match: ID=${match._id}, Status=${match.status}, ConvID=${conversationId}`);

        if (match.status === "active") {
          lastMessage = await Message.findOne({ conversationId })
            .sort({ createdAt: -1 })
            .limit(1);
            
          console.log(`Debug LastMsg: Found=${!!lastMessage}, Content="${lastMessage?.content}"`);

          // Get unread count
          unreadCount = await Message.countDocuments({
            conversationId,
            receiverId: req.user._id,
            read: false,
          });
        }

        // Determine if current user initiated the match
        const isInitiator =
          match.initiatorId &&
          match.initiatorId.toString() === req.user._id.toString();

        return {
          matchId: match._id,
          conversationId,
          status: match.status,
          isInitiator,
          user: {
            _id: otherUser._id,
            name: otherUser.displayName,
            displayName: otherUser.displayName,
            image:
              otherUser.photos && otherUser.photos.length > 0
                ? otherUser.photos[otherUser.mainPhotoIndex ?? 0] ||
                  otherUser.photos[0]
                : null,
            photos: otherUser.photos,
            age: otherUser.age,
            bio: otherUser.bio,
            occupation: otherUser.occupation || "Undisclosed",
            location: otherUser.location || "Unknown Location",
            height: otherUser.height,
            interests: otherUser.interests || [],
            relationshipExpectations:
              otherUser.relationshipExpectations || "Open to possibilities",
            isVerified: otherUser.isVerified || false,
            isPremium: otherUser.isPremium || false,
            gender: otherUser.gender,
            education: otherUser.education,
            drinking: otherUser.drinking,
            smoking: otherUser.smoking,
            drugs: otherUser.drugs,
            distance: Math.floor(Math.random() * 20) + 1, // Mock distance
          },
          lastMessage: lastMessage
            ? {
                content: lastMessage.content || 
                  (lastMessage.messageType === 'image' ? '📷 Photo' : 
                   lastMessage.messageType === 'audio' ? '🎤 Audio Message' : 
                   lastMessage.messageType === 'sticker' ? 'Sticker' : 
                   lastMessage.messageType === 'file' ? '📎 File' : 'Message'),
                createdAt: lastMessage.createdAt,
                messageType: lastMessage.messageType,
              }
            : null,
          unreadCount,
          lastMessageAt: match.lastMessageAt || match.createdAt,
        };
      })
    );

    res.json(matchesWithLastMessage);
  } catch (error) {
    console.error("Get my matches error:", error);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Record interaction (Like/Pass)
// @route   POST /api/matches/interaction
// @access  Private
exports.recordInteraction = async (req, res) => {
  try {
    const { targetId, action } = req.body; // action: LIKE, PASS, SUPERLIKE
    const userId = req.user._id;

    // Validate required fields
    if (!targetId) {
      return res.status(400).json({
        message: "targetId is required",
        received: { targetId, action, userId },
      });
    }

    if (!action) {
      return res.status(400).json({ message: "action is required" });
    }

    const Interaction = require("../models/Interaction");
    const Match = require("../models/Match");

    // Save interaction
    await Interaction.create({
      userId,
      targetId,
      action,
    });

    // Send to Matching Engine for ELO update
    try {
      await axios.post(`${MATCHING_ENGINE_URL}/interaction/`, {
        actor_id: userId.toString(),
        target_id: targetId,
        action: action,
      });
    } catch (engineError) {
      console.error("Matching Engine Interaction Error:", engineError.message);
    }

    // Only process LIKE and SUPERLIKE actions for matching
    if (action === "LIKE" || action === "SUPERLIKE") {
      // Sort IDs to maintain consistency
      const ids = [userId.toString(), targetId.toString()].sort();
      const user1Id = ids[0];
      const user2Id = ids[1];
      const isUser1 = userId.toString() === user1Id;

      // Check if match already exists
      let match = await Match.findOne({
        user1Id,
        user2Id,
      });

      if (match) {
        // Update existing match
        if (isUser1) {
          match.user1Liked = true;
        } else {
          match.user2Liked = true;
        }

        // If both users liked, activate the match
        if (match.user1Liked && match.user2Liked) {
          match.status = "active";
        }

        await match.save();

        return res.json({
          message: "Interaction recorded",
          match: {
            id: match._id,
            status: match.status,
            isMutual: match.status === "active",
          },
        });
      } else {
        // Create new pending match
        match = await Match.create({
          user1Id,
          user2Id,
          status: "pending",
          initiatorId: userId,
          user1Liked: isUser1,
          user2Liked: !isUser1,
        });

        return res.json({
          message: "Interaction recorded",
          match: {
            id: match._id,
            status: "pending",
            isMutual: false,
          },
        });
      }
    }

    res.json({ message: "Interaction recorded" });
  } catch (error) {
    console.error("Record interaction error:", error);
    res.status(500).json({ message: error.message });
  }
};
