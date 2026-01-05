/**
 * Notification type constants and payload schemas
 */

// Notification Types
export const NOTIFICATION_TYPES = {
  MESSAGE: 'message',
  NEARBY_USER: 'nearby_user',
  MATCH: 'match',
  LIKE_REQUEST: 'like_request',
};

/**
 * Validate notification data structure
 * @param {Object} data - Notification data object
 * @param {string} type - Expected notification type
 * @returns {boolean} - True if valid
 */
export const validateNotificationData = (data, type) => {
  if (!data || typeof data !== 'object') {
    return false;
  }

  switch (type) {
    case NOTIFICATION_TYPES.MESSAGE:
      return (
        typeof data.conversationId === 'string' &&
        typeof data.senderId === 'string' &&
        typeof data.senderName === 'string'
      );

    case NOTIFICATION_TYPES.NEARBY_USER:
      return (
        typeof data.userId === 'string' &&
        typeof data.userName === 'string' &&
        typeof data.distance === 'number'
      );

    case NOTIFICATION_TYPES.MATCH:
      return (
        typeof data.matchId === 'string' &&
        typeof data.userId === 'string' &&
        typeof data.userName === 'string'
      );

    case NOTIFICATION_TYPES.LIKE_REQUEST:
      return (
        typeof data.matchId === 'string' &&
        typeof data.userId === 'string' &&
        typeof data.userName === 'string'
      );

    default:
      return false;
  }
};

/**
 * Get notification handler key for routing
 * @param {Object} notification - Notification object with data.type
 * @returns {string|null} - Handler key or null if invalid
 */
export const getNotificationHandlerKey = (notification) => {
  if (!notification || !notification.data || !notification.data.type) {
    return null;
  }

  const validTypes = Object.values(NOTIFICATION_TYPES);
  return validTypes.includes(notification.data.type)
    ? notification.data.type
    : null;
};

/**
 * Create notification payload schema for type safety
 */
export const NotificationSchemas = {
  [NOTIFICATION_TYPES.MESSAGE]: {
    type: NOTIFICATION_TYPES.MESSAGE,
    conversationId: null,
    senderId: null,
    senderName: null,
    messagePreview: null,
  },
  [NOTIFICATION_TYPES.NEARBY_USER]: {
    type: NOTIFICATION_TYPES.NEARBY_USER,
    userId: null,
    userName: null,
    distance: null,
  },
  [NOTIFICATION_TYPES.MATCH]: {
    type: NOTIFICATION_TYPES.MATCH,
    matchId: null,
    userId: null,
    userName: null,
    message: null,
  },
  [NOTIFICATION_TYPES.LIKE_REQUEST]: {
    type: NOTIFICATION_TYPES.LIKE_REQUEST,
    matchId: null,
    userId: null,
    userName: null,
    isSuperLike: false,
  },
};

export default {
  NOTIFICATION_TYPES,
  validateNotificationData,
  getNotificationHandlerKey,
  NotificationSchemas,
};

