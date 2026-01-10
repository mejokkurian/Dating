const mongoose = require("mongoose");
const User = require("../models/User");
const Interaction = require("../models/Interaction");
const Match = require("../models/Match");
const pushNotificationService = require("../services/pushNotificationService");
const NotificationFactory = require("../services/notifications/notificationFactory");

// @desc    Get potential matches (Aggregation Pipeline)
// @route   GET /api/matches
// @access  Private
exports.getMatches = async (req, res) => {
  try {
    const currentUserId = req.user._id;

    // 1. Get IDs of users already interacted with (Like/Pass/SuperLike)
    const interactions = await Interaction.find({ userId: currentUserId }).select("targetId");
    const excludedIds = interactions.map(i => i.targetId); // Keep as ObjectIds
    excludedIds.push(currentUserId); // Exclude self

    // 2. Get IDs of existing matches (pending or active)
    const existingMatches = await Match.find({
      $or: [{ user1Id: currentUserId }, { user2Id: currentUserId }]
    }).select("user1Id user2Id");
    
    existingMatches.forEach(m => {
      if (m.user1Id.toString() !== currentUserId.toString()) excludedIds.push(m.user1Id);
      if (m.user2Id.toString() !== currentUserId.toString()) excludedIds.push(m.user2Id);
    });

    // 3. User Preferences
    const currentUser = await User.findById(currentUserId);
    const userPreference = currentUser.preferences; 
    let genderFilter = {};
    if (userPreference && userPreference !== 'Everyone') {
      let targetGender = userPreference;
      if (targetGender === 'Women') targetGender = 'Female';
      if (targetGender === 'Men') targetGender = 'Male';
      genderFilter = { gender: targetGender };
    }

    console.log(`Debug Aggregation: User ${currentUserId}, Pref: ${userPreference}`);

    // 4. Aggregation Pipeline
    const pipeline = [
      {
        $match: {
          _id: { $nin: excludedIds }, // Exclude seen users
          onboardingCompleted: true,
          ...genderFilter // Apply gender preference
        }
      },
      {
        $addFields: {
          // Calculate Shared Interests Count
          sharedInterestsCount: {
            $size: {
              $setIntersection: ["$interests", currentUser.interests || []]
            }
          },
          // Assign a base Popularity if missing
          popularityRating: { $ifNull: ["$popularityRating", 0] },
          // Check for Matching Relationship Expectations (Bonus)
          isRelationshipMatch: { 
            $cond: { 
              if: { $eq: ["$relationshipExpectations", currentUser.relationshipExpectations] }, 
              then: 1, 
              else: 0 
            } 
          }
        }
      },
      {
        $addFields: {
          // Calculate Final Match Score (Main Feed = Popularity Focused)
          // Weight: Popularity * 2 (Major Driver), Interests * 1 (Tie breaker), Relationship * 2 (Bonus)
          matchScore: {
            $add: [
              { $multiply: ["$sharedInterestsCount", 1] },
              { $multiply: ["$isRelationshipMatch", 2] },
              { $multiply: ["$popularityRating", 2] } // Popularity is King in Main Feed
            ]
          }
        }
      },
      { $sort: { matchScore: -1 } }, // Best matches first
      { $limit: 20 },
      { $project: { password: 0, pushTokens: 0, googleId: 0, appleId: 0 } } // Exclude sensitive info
    ];

    const matches = await User.aggregate(pipeline);
    
    console.log(`Debug Aggregation: Returned ${matches.length} matches.`);
    res.json(matches);

  } catch (error) {
    console.error("Get matches error:", error);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get top picks
// @route   GET /api/matches/top-picks
// @access  Private
exports.getTopPicks = async (req, res) => {
  try {
    const currentUserId = req.user._id;

    // 1. Get Exclusions
    const interactions = await Interaction.find({ userId: currentUserId }).select("targetId");
    const excludedIds = interactions.map(i => i.targetId);
    excludedIds.push(currentUserId);
    
    // 2. Matches
    const existingMatches = await Match.find({
        $or: [{ user1Id: currentUserId }, { user2Id: currentUserId }]
    }).select("user1Id user2Id");
    existingMatches.forEach(m => {
        if (m.user1Id.toString() !== currentUserId.toString()) excludedIds.push(m.user1Id);
        if (m.user2Id.toString() !== currentUserId.toString()) excludedIds.push(m.user2Id);
    });

    // 3. User Preferences
    const currentUser = await User.findById(currentUserId);
    const userPreference = currentUser.preferences;
    let genderFilter = {};
    if (userPreference && userPreference !== 'Everyone') {
        let targetGender = userPreference;
        if (targetGender === 'Women') targetGender = 'Female';
        if (targetGender === 'Men') targetGender = 'Male';
        genderFilter = { gender: targetGender };
    }

    // 4. Aggregation Pipeline (Top Picks = Compatibility Focused)
    const pipeline = [
      {
        $match: {
          _id: { $nin: excludedIds },
          onboardingCompleted: true,
          ...genderFilter
        }
      },
      {
        $addFields: {
          sharedInterestsCount: {
            $size: { $setIntersection: ["$interests", currentUser.interests || []] }
          },
          popularityRating: { $ifNull: ["$popularityRating", 0] },
          // Check for Matching Relationship Expectations (Bonus)
          isRelationshipMatch: { 
            $cond: { 
              if: { $eq: ["$relationshipExpectations", currentUser.relationshipExpectations] }, 
              then: 1, 
              else: 0 
            } 
          }
        }
      },
      {
        $addFields: {
          matchScore: {
            $add: [
              { $multiply: ["$sharedInterestsCount", 20] }, // Massive weight for Interests
              { $multiply: ["$isRelationshipMatch", 30] }, // Massive weight for Goals
              { $multiply: ["$popularityRating", 0.1] }    // Minimal popularity influence
            ]
          }
        }
      },
      { $sort: { matchScore: -1 } },
      { $limit: 10 },
      { $project: { password: 0, pushTokens: 0 } }
    ];

    const topPicks = await User.aggregate(pipeline);
    res.json(topPicks);

  } catch (error) {
    console.error("Get top picks error:", error);
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

    if (!targetId || !action) {
      return res.status(400).json({ message: "targetId and action required" });
    }

    // Remove old interaction (Change of Heart support)
    await Interaction.deleteMany({ userId, targetId });

    // Save New Interaction
    await Interaction.create({ userId, targetId, action });
    
    // Update Popularity (Increment on LIKE/SUPERLIKE)
    if (action === 'LIKE' || action === 'SUPERLIKE') {
        await User.findByIdAndUpdate(targetId, { $inc: { popularityRating: 1 } });
    }

    // Only process LIKE and SUPERLIKE actions for matching logic
    if (action === "LIKE" || action === "SUPERLIKE") {
      const ids = [userId.toString(), targetId.toString()].sort();
      const user1Id = ids[0];
      const user2Id = ids[1];
      const isUser1 = userId.toString() === user1Id;

      // Check for Existing Match
      let match = await Match.findOne({ user1Id, user2Id });

      if (match) {
        // Update Match
        if (isUser1) match.user1Liked = true;
        else match.user2Liked = true;

        if (match.user1Liked && match.user2Liked) {
          match.status = "active";
          
          // Send Match Notification
          try {
            const currentUser = await User.findById(userId);
            const otherUser = await User.findById(targetId);
            if (currentUser && otherUser) {
              const notification = NotificationFactory.createMatchNotification(currentUser, match._id.toString());
              await pushNotificationService.sendNotification(targetId.toString(), notification);
            }
          } catch (e) {
            console.error("Match Notif Error:", e);
          }
        }
        await match.save();
        return res.json({ message: "Interaction recorded", match: { id: match._id, status: match.status, isMutual: match.status === "active" } });
      } else {
        // Create Pending Match
        match = await Match.create({
          user1Id, user2Id, status: "pending", initiatorId: userId,
          user1Liked: isUser1, user2Liked: !isUser1
        });

        // Send Like Request Notification
        try {
           const currentUser = await User.findById(userId);
           if (currentUser) {
             const isSuperLike = action === "SUPERLIKE";
             const notification = NotificationFactory.createLikeRequestNotification(currentUser, match._id.toString(), isSuperLike);
             await pushNotificationService.sendNotification(targetId.toString(), notification);
           }
        } catch (e) {
            console.error("Like Notif Error:", e);
        }

        return res.json({ message: "Interaction recorded", match: { id: match._id, status: "pending", isMutual: false } });
      }
    }

    res.json({ message: "Interaction recorded" });
  } catch (error) {
    console.error("Interaction Error:", error);
    res.status(500).json({ message: error.message });
  }
};


// @desc    Get user's actual matches (people they've matched with)
// @route   GET /api/matches/my-matches
// @access  Private
exports.getMyMatches = async (req, res) => {
  try {
    const Message = require("../models/Message");

    // Find all matches where user is either user1 or user2 (including pending)
    const matches = await Match.find({
      $or: [{ user1Id: req.user._id }, { user2Id: req.user._id }],
      status: "active", // Only active matches
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

    // Format the response
    const matchesWithLastMessage = await Promise.all(
      matches.map(async (match) => {
        const conversationId = match.getConversationId();
        
        // Define 'otherUser'
        const otherUser = match.user1Id._id.toString() === req.user._id.toString() 
          ? match.user2Id 
          : match.user1Id;

        // Get last message
        let lastMessage = await Message.findOne({ conversationId })
            .sort({ createdAt: -1 })
            .limit(1);
            
        // Get unread count
        const unreadCount = await Message.countDocuments({
            conversationId,
            receiverId: req.user._id,
            read: false,
        });

        // Determine matching initiator
        const isInitiator = match.initiatorId && match.initiatorId.toString() === req.user._id.toString();

        return {
          matchId: match._id,
          conversationId,
          status: match.status,
          isInitiator,
          user: {
            _id: otherUser._id,
            displayName: otherUser.displayName,
            age: otherUser.age,
            photos: otherUser.photos || [],
            image: otherUser.photos && otherUser.photos.length > 0 ? otherUser.photos[0] : null,
            isVerified: otherUser.isVerified,
            isPremium: otherUser.isPremium
          },
          lastMessage: lastMessage
            ? {
                content: lastMessage.content || 
                  (lastMessage.messageType === 'image' ? '📷 Photo' : 
                   lastMessage.messageType === 'audio' ? '🎤 Audio Message' : 'Message'),
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

// @desc    Respond to like (optional, for explicit Accept/Reject flows)
// @route   POST /api/matches/:matchId/respond
// @access  Private


// @desc    Respond to a like (Accept/Decline)
// @route   POST /api/matches/:matchId/respond
// @access  Private
exports.respondToLike = async (req, res) => {
  try {
    const { matchId } = req.params;
    const { action } = req.body; // 'accept' or 'decline'
    const userId = req.user._id;

    // Local requires to prevent circular deps or ensure availability
    const Match = require("../models/Match");
    const Interaction = require("../models/Interaction");

    // Find the match
    const match = await Match.findById(matchId);

    if (!match) {
      return res.status(404).json({ message: "Match not found" });
    }

    // Verify user is part of this match
    const isUser1 = match.user1Id.toString() === userId.toString();
    const isUser2 = match.user2Id.toString() === userId.toString();

    if (!isUser1 && !isUser2) {
      return res.status(403).json({ message: "Unauthorized" });
    }

    if (action === 'accept') {
      // Record the interaction
      const targetUserId = isUser1 ? match.user2Id : match.user1Id;
      await Interaction.deleteMany({ userId, targetId: targetUserId }); // Clean old interactions
      await Interaction.create({
        userId,
        targetId: targetUserId,
        action: 'LIKE',
      });
      
      // Accept the like - update the match to liked
      if (isUser1) match.user1Liked = true;
      else match.user2Liked = true;
      
      // Notify Initiator
      try {
        const currentUser = await User.findById(userId);
        const initiatorId = match.initiatorId;
        
        if (initiatorId && initiatorId.toString() !== userId.toString()) {
          const initiator = await User.findById(initiatorId);
          if (currentUser && initiator) {
             const acceptNotification = {
               title: '✅ Request Accepted!',
               body: `${currentUser.displayName} accepted your Connect Now request!`,
               data: {
                 type: 'connect_now_accepted',
                 matchId: match._id.toString(),
                 userId: currentUser._id.toString(),
               },
             };
             await pushNotificationService.sendNotification(initiatorId.toString(), acceptNotification);
          }
        }
      } catch (notifError) {
        console.error('Error sending accept notification:', notifError);
      }

      // If both liked, activate the match
      if (match.user1Liked && match.user2Liked) {
        match.status = "active";
        // Notify Other User of Match
        try {
          const currentUser = await User.findById(userId);
          const otherUserId = isUser1 ? match.user2Id : match.user1Id;
          const otherUser = await User.findById(otherUserId);
          
          if (currentUser && otherUser) {
            const notification = NotificationFactory.createMatchNotification(currentUser, match._id.toString());
            await pushNotificationService.sendNotification(otherUserId.toString(), notification);
          }
        } catch (notifError) {
          console.error('Error sending match notification:', notifError);
        }
      }

      await match.save();

      return res.json({
        message: "Match accepted",
        match: {
          id: match._id,
          status: match.status,
          isMutual: match.status === "active",
        },
      });
    } else if (action === 'decline') {
      // Record PASS interaction
      const targetUserId = isUser1 ? match.user2Id : match.user1Id;
      await Interaction.deleteMany({ userId, targetId: targetUserId });
      await Interaction.create({
        userId,
        targetId: targetUserId,
        action: 'PASS',
      });
      
      await Match.findByIdAndDelete(matchId);

      return res.json({ message: "Match declined" });
    } else {
      return res.status(400).json({ message: "Invalid action. Use 'accept' or 'decline'" });
    }

  } catch (error) {
    console.error("Respond to like error:", error);
    res.status(500).json({ message: error.message });
  }
};
