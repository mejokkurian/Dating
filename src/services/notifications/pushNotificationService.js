/**
 * Push Notification Service
 * Handles all Expo notification operations
 */
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

// Configure how notifications are handled when app is in foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

/**
 * Request notification permissions
 * @returns {Promise<{status: string, granted: boolean}>}
 */
export const requestPermissions = async () => {
  if (!Device.isDevice) {
    console.warn('Must use physical device for Push Notifications');
    return { status: 'not-available', granted: false };
  }

  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.warn('Failed to get push token for push notification!');
      return { status: finalStatus, granted: false };
    }

    return { status: finalStatus, granted: true };
  } catch (error) {
    console.error('Error requesting notification permissions:', error);
    return { status: 'error', granted: false, error };
  }
};

/**
 * Get current permission status
 * @returns {Promise<string>}
 */
export const getPermissionStatus = async () => {
  try {
    const { status } = await Notifications.getPermissionsAsync();
    return status;
  } catch (error) {
    console.error('Error getting permission status:', error);
    return 'undetermined';
  }
};

/**
 * Register for push notifications and get token
 * @returns {Promise<string|null>} - Push token or null if unavailable
 */
export const registerForPushNotifications = async () => {
  try {
    // Check if device supports push notifications
    if (!Device.isDevice) {
      console.warn('Must use physical device for Push Notifications');
      return null;
    }

    // Request permissions first
    const permissionResult = await requestPermissions();
    if (!permissionResult.granted) {
      return null;
    }

    // Get push token
    const projectId = Constants.expoConfig?.extra?.eas?.projectId || Constants.easConfig?.projectId;
    const tokenData = await Notifications.getExpoPushTokenAsync({
      projectId: projectId,
    });

    const token = tokenData.data;

    // Configure Android channel
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'Default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF6B9D',
      });
    }

    return token;
  } catch (error) {
    console.error('Error registering for push notifications:', error);
    return null;
  }
};

/**
 * Validate Expo push token format
 * @param {string} token - Push token to validate
 * @returns {boolean}
 */
export const validateToken = (token) => {
  if (!token || typeof token !== 'string') {
    return false;
  }
  // Expo push tokens start with ExponentPushToken or Exp
  return token.startsWith('ExponentPushToken[') || token.startsWith('ExpoPushToken[');
};

/**
 * Create notification channel for Android (if needed)
 * @param {string} channelId - Channel ID
 * @param {Object} options - Channel options
 */
export const createNotificationChannel = async (channelId, options = {}) => {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(channelId, {
      name: options.name || 'Default',
      importance: options.importance || Notifications.AndroidImportance.MAX,
      vibrationPattern: options.vibrationPattern || [0, 250, 250, 250],
      lightColor: options.lightColor || '#FF6B9D',
      ...options,
    });
  }
};

/**
 * Cancel all scheduled notifications
 */
export const cancelAllNotifications = async () => {
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
  } catch (error) {
    console.error('Error canceling notifications:', error);
  }
};

/**
 * Set badge count
 * @param {number} count - Badge count
 */
export const setBadgeCount = async (count) => {
  try {
    await Notifications.setBadgeCountAsync(count);
  } catch (error) {
    console.error('Error setting badge count:', error);
  }
};

/**
 * Clear badge count
 */
export const clearBadge = async () => {
  try {
    await Notifications.setBadgeCountAsync(0);
  } catch (error) {
    console.error('Error clearing badge:', error);
  }
};

export default {
  requestPermissions,
  getPermissionStatus,
  registerForPushNotifications,
  validateToken,
  createNotificationChannel,
  cancelAllNotifications,
  setBadgeCount,
  clearBadge,
};

