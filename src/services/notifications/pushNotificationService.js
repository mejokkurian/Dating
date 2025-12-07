/**
 * Push Notification Service
 * Handles all Expo notification operations
 */
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform, Linking, Alert } from 'react-native';

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
 * @param {boolean} forceRequest - If true, request permission even if previously denied
 * @returns {Promise<{status: string, granted: boolean, canAskAgain: boolean}>}
 */
export const requestPermissions = async (forceRequest = false) => {
  if (!Device.isDevice) {
    console.warn('Must use physical device for Push Notifications');
    return { status: 'not-available', granted: false, canAskAgain: false };
  }

  try {
    const { status: existingStatus, canAskAgain } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    let canStillAsk = canAskAgain !== false;

    // If already granted, return success
    if (existingStatus === 'granted') {
      return { status: finalStatus, granted: true, canAskAgain: true };
    }

    // If denied and can't ask again, return denied status
    if (existingStatus === 'denied' && !canStillAsk && !forceRequest) {
      return { status: 'denied', granted: false, canAskAgain: false };
    }

    // Request permissions if not granted
    if (existingStatus !== 'granted' && (canStillAsk || forceRequest)) {
      const response = await Notifications.requestPermissionsAsync();
      finalStatus = response.status;
      canStillAsk = response.canAskAgain !== false;
    }

    if (finalStatus !== 'granted') {
      console.warn('Failed to get push token for push notification!');
      return { 
        status: finalStatus, 
        granted: false, 
        canAskAgain: canStillAsk 
      };
    }

    return { status: finalStatus, granted: true, canAskAgain: true };
  } catch (error) {
    console.error('Error requesting notification permissions:', error);
    return { status: 'error', granted: false, canAskAgain: false, error };
  }
};

/**
 * Get current permission status with detailed info
 * @returns {Promise<{status: string, canAskAgain: boolean}>}
 */
export const getPermissionStatus = async () => {
  try {
    const response = await Notifications.getPermissionsAsync();
    return {
      status: response.status,
      canAskAgain: response.canAskAgain !== false,
    };
  } catch (error) {
    console.error('Error getting permission status:', error);
    return { status: 'undetermined', canAskAgain: true };
  }
};

/**
 * Register for push notifications and get token
 * @returns {Promise<string|null>} - Push token or null if unavailable
 */
export const registerForPushNotifications = async (skipPermissionCheck = false) => {
  try {
    // Check if device supports push notifications
    if (!Device.isDevice) {
      console.warn('Must use physical device for Push Notifications');
      return null;
    }

    // Request permissions first (unless already checked)
    if (!skipPermissionCheck) {
      const permissionResult = await requestPermissions();
      if (!permissionResult.granted) {
        console.warn('Permissions not granted, cannot get push token');
        return null;
      }
    }

    // Get push token - projectId is optional in newer Expo versions
    // Try multiple ways to get the project ID
    let projectId = 
      Constants.expoConfig?.extra?.eas?.projectId || 
      Constants.easConfig?.projectId ||
      Constants.expoConfig?.extra?.easProjectId ||
      Constants.expoConfig?.projectId;
    
    // Debug: Log what's available in Constants
    if (!projectId) {
      console.log('Constants.expoConfig keys:', Object.keys(Constants.expoConfig || {}));
      console.log('Constants.expoConfig.extra:', Constants.expoConfig?.extra);
    }
    
    let tokenData;
    
    // Try to get push token - projectId is optional for development builds
    try {
      if (projectId) {
        console.log('Getting Expo push token with project ID:', projectId);
        tokenData = await Notifications.getExpoPushTokenAsync({
          projectId: projectId,
        });
      } else {
        // For development builds, Expo can infer the project ID
        console.log('Getting Expo push token without explicit project ID (Expo will infer it)');
        tokenData = await Notifications.getExpoPushTokenAsync();
      }
    } catch (error) {
      console.error('Error getting push token:', error.message);
      
      // If it fails with projectId, try without
      if (projectId) {
        console.log('Retrying without project ID...');
        try {
          tokenData = await Notifications.getExpoPushTokenAsync();
        } catch (retryError) {
          console.error('Failed to get push token even without project ID:', retryError.message);
          throw retryError;
        }
      } else {
        throw error;
      }
    }

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

/**
 * Open device settings for the app
 */
export const openSettings = async () => {
  try {
    if (Platform.OS === 'ios') {
      await Linking.openURL('app-settings:');
    } else {
      await Linking.openSettings();
    }
  } catch (error) {
    console.error('Error opening settings:', error);
  }
};

/**
 * Request permissions with retry option and settings prompt
 * @param {Function} onDenied - Callback when permission is denied
 * @returns {Promise<{status: string, granted: boolean, canAskAgain: boolean}>}
 */
export const requestPermissionsWithRetry = async (onDenied = null) => {
  const result = await requestPermissions();
  
  if (!result.granted) {
    // If permission was denied and can't ask again, offer to open settings
    if (result.status === 'denied' && !result.canAskAgain && onDenied) {
      onDenied(result);
    }
  }
  
  return result;
};

export default {
  requestPermissions,
  requestPermissionsWithRetry,
  getPermissionStatus,
  registerForPushNotifications,
  validateToken,
  createNotificationChannel,
  cancelAllNotifications,
  setBadgeCount,
  clearBadge,
  openSettings,
};

