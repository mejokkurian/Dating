const User = require('../models/User');
const Match = require('../models/Match');
const pushNotificationService = require('../services/pushNotificationService');
const NotificationFactory = require('../services/notifications/notificationFactory');

// Helper function to generate conversation ID from two user IDs (same as chatHandler)
const getConversationId = (userId1, userId2) => {
  const ids = [userId1.toString(), userId2.toString()].sort();
  return `${ids[0]}_${ids[1]}`;
};

// Helper function to calculate distance between two coordinates (Haversine formula)
const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371000; // Earth's radius in meters
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // Distance in meters
};

// @desc    Update user location
// @route   POST /api/location/update
// @access  Private
exports.updateLocation = async (req, res) => {
  try {
    const { latitude, longitude } = req.body;

    if (!latitude || !longitude) {
      return res.status(400).json({ message: 'Latitude and longitude are required' });
    }

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Update location (GeoJSON format: [longitude, latitude])
    user.lastLocation = {
      type: 'Point',
      coordinates: [longitude, latitude],
      timestamp: new Date()
    };

    await user.save();

    res.json({ 
      message: 'Location updated successfully',
      location: user.lastLocation
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get nearby users
// @route   GET /api/location/nearby
// @access  Private
exports.getNearbyUsers = async (req, res) => {
  try {
    const { radius = 1000 } = req.query; // Default 1km in meters
    const currentUser = await User.findById(req.user._id);

    if (!currentUser || !currentUser.lastLocation || !currentUser.lastLocation.coordinates) {
      // return res.status(400).json({ message: 'User location not set' });
      // Return empty list instead of error to avoid frontend 400 bugs while location initializes
      return res.json([]); 
    }

    const [currentLon, currentLat] = currentUser.lastLocation.coordinates;

    // Only find users who have Connect Now enabled and have a location
    const nearbyUsers = await User.find({
      _id: { $ne: currentUser._id }, // Exclude current user
      connectNowEnabled: true,
      'lastLocation.coordinates': { $exists: true, $ne: null },
      'lastLocation': {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: [currentLon, currentLat]
          },
          $maxDistance: parseInt(radius)
        }
      }
    }).select('-password -email -phoneNumber');

    // Get all matches for current user to check which nearby users are already matched
    const userMatches = await Match.find({
      $or: [
        { user1Id: req.user._id },
        { user2Id: req.user._id }
      ]
    }).select('user1Id user2Id status initiatorId');

    // Create a map of matched user IDs to their match info
    const matchMap = new Map();
    userMatches.forEach(match => {
      const otherUserId = match.user1Id.toString() === req.user._id.toString() 
        ? match.user2Id.toString() 
        : match.user1Id.toString();
      matchMap.set(otherUserId, {
        status: match.status,
        matchId: match._id,
        initiatorId: match.initiatorId
      });
    });

    // Calculate exact distances and add to results, including match information
    const usersWithDistance = nearbyUsers.map(user => {
      const [userLon, userLat] = user.lastLocation.coordinates;
      const distance = calculateDistance(
        currentLat,
        currentLon,
        userLat,
        userLon
      );

      const userObj = user.toObject();
      userObj.distance = Math.round(distance); // Distance in meters
      const userIdStr = user._id.toString();
      const matchInfo = matchMap.get(userIdStr) || null;
      userObj.hasMatch = matchInfo !== null;
      userObj.matchStatus = matchInfo ? matchInfo.status : null;
      userObj.matchId = matchInfo ? matchInfo.matchId : null;
      userObj.initiatorId = matchInfo ? matchInfo.initiatorId?.toString() : null;
      return userObj;
    });

    // Sort by distance
    usersWithDistance.sort((a, b) => a.distance - b.distance);

    res.json(usersWithDistance);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Toggle Connect Now
// @route   PUT /api/location/connect-now
// @access  Private
exports.toggleConnectNow = async (req, res) => {
  try {
    const { enabled } = req.body;
    
    // Use direct MongoDB update to avoid validation issues
    const result = await User.updateOne(
      { _id: req.user._id },
      { $set: { connectNowEnabled: enabled === true } }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Fetch updated user to return
    const updatedUser = await User.findById(req.user._id).select('-password');

    if (!updatedUser) {
      return res.status(404).json({ message: 'User not found after update' });
    }

    if (enabled === true && updatedUser.lastLocation && updatedUser.lastLocation.coordinates) {
      const [lon, lat] = updatedUser.lastLocation.coordinates;
      console.log(`[ConnectNow] Triggering notifications for user ${updatedUser._id} at [${lon}, ${lat}]`);
      
      // Find nearby users to notify
      // We wrap this in a non-blocking block to avoid delaying the response
      (async () => {
        try {
          const nearbyToNotify = await User.find({
            _id: { $ne: req.user._id },
            connectNowEnabled: true,
            'lastLocation.coordinates': { $exists: true, $ne: null },
            'lastLocation': {
              $nearSphere: {
                $geometry: {
                  type: 'Point',
                  coordinates: [lon, lat]
                },
                $maxDistance: 1000 // 1km
              }
            }
          }).select('_id displayName name');

          console.log(`[ConnectNow] Found ${nearbyToNotify.length} nearby active users to notify`);

          for (const nearbyUser of nearbyToNotify) {
            try {
              console.log(`[ConnectNow] Sending notification to ${nearbyUser.displayName} (${nearbyUser._id})`);
              const notification = NotificationFactory.createConnectNowNotification(updatedUser);
              await pushNotificationService.sendNotification(nearbyUser._id.toString(), notification);
            } catch (notifErr) {
              console.error(`[ConnectNow] Failed to notify user ${nearbyUser._id}:`, notifErr);
            }
          }
        } catch (nearbyErr) {
          console.error('[ConnectNow] Error finding nearby users for notification:', nearbyErr);
        }
      })();
    } else {
      console.log(`[ConnectNow] Notification skipped. Enabled: ${enabled}, HasLocation: ${!!updatedUser.lastLocation}`);
    }

    res.json({ 
      message: `Connect Now ${enabled ? 'enabled' : 'disabled'}`,
      connectNowEnabled: updatedUser.connectNowEnabled
    });
  } catch (error) {
    console.error('Error toggling Connect Now:', error);
    console.error('Error stack:', error.stack);
    console.error('Request body:', req.body);
    console.error('User ID:', req.user?._id);
    res.status(500).json({ 
      message: error.message || 'Failed to toggle Connect Now',
      error: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};

// @desc    Update location privacy settings
// @route   PUT /api/location/privacy
// @access  Private
exports.updateLocationPrivacy = async (req, res) => {
  try {
    const { showExactDistance, shareLocation } = req.body;
    
    // Build update object
    const updateData = {};
    
    if (showExactDistance !== undefined) {
      updateData['locationPrivacy.showExactDistance'] = Boolean(showExactDistance);
    }
    if (shareLocation !== undefined) {
      updateData['locationPrivacy.shareLocation'] = Boolean(shareLocation);
    }

    // If locationPrivacy doesn't exist, initialize it
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (!user.locationPrivacy) {
      updateData['locationPrivacy'] = {
        showExactDistance: showExactDistance !== undefined ? Boolean(showExactDistance) : true,
        shareLocation: shareLocation !== undefined ? Boolean(shareLocation) : true,
      };
    }

    // Use findByIdAndUpdate for atomic update
    const updatedUser = await User.findByIdAndUpdate(
      req.user._id,
      { $set: updateData },
      { new: true, runValidators: true }
    ).select('-password');

    if (!updatedUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({ 
      message: 'Privacy settings updated',
      locationPrivacy: updatedUser.locationPrivacy || {
        showExactDistance: true,
        shareLocation: true,
      }
    });
  } catch (error) {
    console.error('Error updating location privacy:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({ 
      message: error.message || 'Failed to update privacy settings',
      error: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};

// @desc    Send quick hello message
// @route   POST /api/location/quick-hello
// @access  Private
exports.sendQuickHello = async (req, res) => {
  try {
    const { userId, message } = req.body;
    const senderId = req.user._id || req.user.id;

    if (!userId || !message) {
      return res.status(400).json({ message: 'User ID and message are required' });
    }

    if (!senderId) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    const recipient = await User.findById(userId);
    if (!recipient) {
      return res.status(404).json({ message: 'Recipient not found' });
    }

    // Check if match exists using correct field names (Match model uses user1Id and user2Id)
    let match = await Match.findOne({
      $or: [
        { user1Id: senderId, user2Id: userId },
        { user1Id: userId, user2Id: senderId }
      ]
    });

    const sender = await User.findById(senderId).select('displayName name photos');
    const matchWasCreated = !match;
    const matchWasActivated = match && match.status === 'pending';

    // If no match exists, create a pending match
    // Sort IDs to match the Match model's expected format (sorted for consistency)
    if (!match) {
      const sortedIds = [senderId, userId].sort((a, b) => a.toString().localeCompare(b.toString()));
      const isUser1 = senderId.toString() === sortedIds[0].toString();
      
      match = new Match({
        user1Id: sortedIds[0],
        user2Id: sortedIds[1],
        status: 'pending',
        initiatorId: senderId,
        user1Liked: isUser1,
        user2Liked: !isUser1
      });
      await match.save();
    }
    // Note: We do NOT auto-activate pending matches when sending a message
    // Match should only become active when BOTH users have liked each other

    // Create the message document
    const Message = require('../models/Message');
    // Generate conversationId the same way chatHandler does (sorted IDs)
    const conversationId = getConversationId(senderId, userId);
    
    const newMessage = new Message({
      senderId: senderId,
      receiverId: userId,
      content: message,
      messageType: 'text',
      conversationId: conversationId,
      status: 'sent'
    });
    
    await newMessage.save();

    // Emit socket event to notify recipient (if they're online)
    const io = req.app.get('io');
    if (io) {
      // 1. Emit new message event (existing)
      io.to(userId.toString()).emit('new_message', {
        _id: newMessage._id,
        senderId: { _id: senderId },
        receiverId: userId,
        content: message,
        messageType: 'text',
        conversationId: conversationId,
        createdAt: newMessage.createdAt,
        status: 'sent'
      });

      // 2. Emit nearby_user_entered event to update Connect Now list
      // We need to fetch the sender's full profile to get location
      const fullSender = await User.findById(senderId).select('-password -email -phoneNumber');
      
      if (recipient.lastLocation && recipient.lastLocation.coordinates && 
          fullSender && fullSender.lastLocation && fullSender.lastLocation.coordinates) {
            
        // Fetch full sender profile for the card
        
        if (fullSender) {
          const [recipientLon, recipientLat] = recipient.lastLocation.coordinates;
          const [senderLon, senderLat] = fullSender.lastLocation.coordinates;
          
          const distance = calculateDistance(
            recipientLat,
            recipientLon,
            senderLat,
            senderLon
          );

          const senderObj = fullSender.toObject();
          senderObj.distance = Math.round(distance);
          senderObj.hasMatch = true;
          senderObj.matchStatus = 'pending';
          senderObj.matchId = match._id;
          senderObj.initiatorId = senderId.toString();

          io.to(userId.toString()).emit('nearby_user_entered', {
            user: senderObj
          });
        }
      }
    }

    // Send push notification for match creation or activation
    if (matchWasCreated || matchWasActivated) {
      try {
        const notification = NotificationFactory.createMatchNotification(
          sender,
          match._id.toString(),
          message
        );
        await pushNotificationService.sendNotification(userId.toString(), notification);
      } catch (notificationError) {
        console.error('Error sending match push notification:', notificationError);
        // Don't fail the request if notification fails
      }
    }

    res.json({ 
      message: 'Quick hello sent',
      matchId: match._id,
      matchStatus: match.status,
      initiatorId: match.initiatorId,
      messageId: newMessage._id
    });
  } catch (error) {
    console.error('Error sending quick hello:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({ 
      message: error.message || 'Failed to send quick hello',
      error: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};

