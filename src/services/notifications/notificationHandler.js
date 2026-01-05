/**
 * Notification Handler
 * Routes notifications to appropriate screens and handles navigation
 */
import { NOTIFICATION_TYPES, getNotificationHandlerKey } from './notificationTypes';

/**
 * Handle notification tap/navigation
 * @param {Object} notification - Notification object
 * @param {Object} navigation - Navigation object
 */
export const handleNotificationTap = (notification, navigation) => {
  if (!notification || !notification.data) {
    console.warn('Invalid notification data');
    return;
  }

  const handlerKey = getNotificationHandlerKey(notification);
  if (!handlerKey) {
    console.warn('Unknown notification type:', notification.data.type);
    return;
  }

  const handlers = {
    [NOTIFICATION_TYPES.MESSAGE]: (data, nav) => {
      nav.navigate('Messages', {
        screen: 'Chat',
        params: {
          user: { _id: data.senderId, name: data.senderName },
          conversationId: data.conversationId,
        },
      });
    },

    [NOTIFICATION_TYPES.NEARBY_USER]: (data, nav) => {
      nav.navigate('ConnectNow');
    },

    [NOTIFICATION_TYPES.MATCH]: (data, nav) => {
      nav.navigate('Messages', {
        screen: 'Chat',
        params: {
          user: { _id: data.userId, name: data.userName },
          matchId: data.matchId,
        },
      });
    },

    [NOTIFICATION_TYPES.LIKE_REQUEST]: (data, nav) => {
      // Navigate to Messages screen to show pending matches
      nav.navigate('Messages');
    },
  };

  const handler = handlers[handlerKey];
  if (handler) {
    try {
      handler(notification.data, navigation);
    } catch (error) {
      console.error('Error handling notification tap:', error);
    }
  }
};

/**
 * Parse notification data safely
 * @param {Object} notification - Notification object
 * @returns {Object|null} - Parsed data or null if invalid
 */
export const parseNotificationData = (notification) => {
  if (!notification || !notification.data) {
    return null;
  }

  return {
    type: notification.data.type || null,
    ...notification.data,
  };
};

/**
 * Get notification title based on type
 * @param {Object} notification - Notification object
 * @returns {string}
 */
export const getNotificationTitle = (notification) => {
  if (!notification || !notification.request) {
    return '';
  }

  const title = notification.request.content?.title;
  return title || '';
};

/**
 * Get notification body based on type
 * @param {Object} notification - Notification object
 * @returns {string}
 */
export const getNotificationBody = (notification) => {
  if (!notification || !notification.request) {
    return '';
  }

  const body = notification.request.content?.body;
  return body || '';
};

export default {
  handleNotificationTap,
  parseNotificationData,
  getNotificationTitle,
  getNotificationBody,
};

