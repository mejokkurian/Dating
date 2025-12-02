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
}

module.exports = NotificationFactory;

