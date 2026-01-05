/**
 * Notification Factory
 * Creates properly formatted notification payloads
 */
const NOTIFICATION_TYPES = require('./notificationTypes');

class NotificationFactory {
  /**
   * Create a message notification
   * @param {Object} sender - Sender user object
   * @param {string} messagePreview - Preview of the message
   * @param {string} conversationId - Conversation ID
   * @returns {Object} - Formatted notification payload
   */
  static createMessageNotification(sender, messagePreview, conversationId) {
    return {
      to: null, // Will be set by service
      sound: 'default',
      title: sender.displayName || sender.name || 'New Message',
      body: messagePreview || 'You have a new message',
      data: {
        type: NOTIFICATION_TYPES.MESSAGE,
        conversationId,
        senderId: sender._id.toString(),
        senderName: sender.displayName || sender.name,
      },
      badge: 1,
    };
  }

  /**
   * Create a nearby user notification
   * @param {Object} user - Nearby user object
   * @param {number} distance - Distance in meters
   * @returns {Object} - Formatted notification payload
   */
  static createNearbyUserNotification(user, distance) {
    const distanceText = distance < 1000 
      ? `${Math.round(distance)}m away`
      : `${(distance / 1000).toFixed(1)}km away`;

    return {
      to: null, // Will be set by service
      sound: 'default',
      title: 'New User Nearby',
      body: `${user.displayName || user.name} is ${distanceText}`,
      data: {
        type: NOTIFICATION_TYPES.NEARBY_USER,
        userId: user._id.toString(),
        userName: user.displayName || user.name,
        distance: Math.round(distance),
      },
    };
  }

  /**
   * Create a match notification
   * @param {Object} user - Matched user object
   * @param {string} matchId - Match ID
   * @param {string} message - Optional match message
   * @returns {Object} - Formatted notification payload
   */
  static createMatchNotification(user, matchId, message = null) {
    return {
      to: null, // Will be set by service
      sound: 'default',
      title: 'New Match! 💫',
      body: message 
        ? `${user.displayName || user.name}: ${message}`
        : `${user.displayName || user.name} sent you a message`,
      data: {
        type: NOTIFICATION_TYPES.MATCH,
        matchId,
        userId: user._id.toString(),
        userName: user.displayName || user.name,
        message: message || null,
      },
    badge: 1,
    };
  }

  /**
   * Create a call notification
   * @param {Object} caller - Caller user object
   * @param {string} callType - Type of call ('audio' or 'video')
   * @returns {Object} - Formatted notification payload
   */
  static createCallNotification(caller, callType = 'audio') {
    const callTypeText = callType === 'video' ? '📹 Video' : '📞 Audio';
    
    return {
      to: null, // Will be set by service
      sound: 'default',
      title: `Incoming ${callType === 'video' ? 'Video' : 'Audio'} Call`,
      body: `${caller.displayName || caller.name || 'Someone'} is calling you`,
      data: {
        type: NOTIFICATION_TYPES.CALL,
        callType,
        callerId: caller._id.toString(),
        callerName: caller.displayName || caller.name,
        // Add timestamp for handling stale notifications
        timestamp: Date.now(),
      },
      badge: 1,
      priority: 'high', // High priority for immediate delivery
      channelId: 'calls', // Android notification channel for calls
      // iOS specific - content-available wakes app in background
      _contentAvailable: true,
      // Android specific - high priority data message
      _data: {
        type: 'call',
        callType,
        callerId: caller._id.toString(),
        callerName: caller.displayName || caller.name,
        timestamp: Date.now(),
      },
    };
  }

  /**
   * Create a like request notification
   * @param {Object} user - User who sent the like
   * @param {string} matchId - Match ID
   * @param {boolean} isSuperLike - Whether it's a super like
   * @returns {Object} - Formatted notification payload
   */
  static createLikeRequestNotification(user, matchId, isSuperLike = false) {
    const emoji = isSuperLike ? '⭐' : '💖';
    const title = isSuperLike ? 'Someone Super Liked You!' : 'Someone Likes You!';
    const body = `${user.displayName || user.name} ${isSuperLike ? 'super liked' : 'liked'} your profile`;

    return {
      to: null, // Will be set by service
      sound: 'default',
      title: `${emoji} ${title}`,
      body,
      data: {
        type: NOTIFICATION_TYPES.LIKE_REQUEST,
        matchId,
        userId: user._id.toString(),
        userName: user.displayName || user.name,
        isSuperLike,
      },
      badge: 1,
    };
  }

  /**
   * Create a connect now notification
   * @param {Object} user - User who enabled Connect Now
   * @returns {Object} - Formatted notification payload
   */
  static createConnectNowNotification(user) {
    return {
      to: null, // Will be set by service
      sound: 'default',
      title: 'Someone Nearby! 👋',
      body: `${user.displayName || user.name} is now active on Connect Now near you. Tap to say hello!`,
      data: {
        type: NOTIFICATION_TYPES.NEARBY_USER,
        userId: user._id.toString(),
        userName: user.displayName || user.name,
      },
      badge: 1,
    };
  }
}


module.exports = NotificationFactory;

