/**
 * Notification Context
 * Manages global notification state and push token registration
 */
import React, { createContext, useState, useContext, useEffect, useCallback, useRef } from 'react';
import { Alert, Platform, Linking, AppState } from 'react-native';
import * as Notifications from 'expo-notifications';
import { useAuth } from './AuthContext';
import {
  requestPermissions,
  getPermissionStatus,
  registerForPushNotifications,
  validateToken,
  clearBadge,
  openSettings,
} from '../services/notifications/pushNotificationService';
import { handleNotificationTap } from '../services/notifications/notificationHandler';
import { registerPushToken } from '../services/api/user';

const NotificationContext = createContext({});

export const useNotification = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotification must be used within NotificationProvider');
  }
  return context;
};

export const NotificationProvider = ({ children, navigationRef }) => {
  const { user } = useAuth();
  const [expoPushToken, setExpoPushToken] = useState(null);
  const [permissionStatus, setPermissionStatus] = useState('undetermined');
  const [loading, setLoading] = useState(false);
  const notificationListener = useRef(null);
  const responseListener = useRef(null);

  /**
   * Register push token with backend
   */
  const syncTokenWithBackend = useCallback(async (token) => {
    if (!token || !user) {
      console.log('⚠️ Cannot sync token - missing token or user:', { hasToken: !!token, hasUser: !!user });
      return;
    }

    try {
      console.log('\n🔄 ========== SYNCING TOKEN WITH BACKEND ==========');
      console.log(`📋 User: ${user._id}`);
      console.log(`📋 Token: ${token.substring(0, 30)}...`);
      console.log('📤 Sending POST request to /api/users/push-token...');
      
      await registerPushToken(token); // Register token
      
      console.log('✅ Push token successfully synced with backend');
      console.log('🔄 ========== SYNC COMPLETE ==========\n');
    } catch (error) {
      console.error('❌ Error syncing push token with backend:', error);
      console.error('Error details:', error.response?.data || error.message);
      if (error.response) {
        console.error('Response status:', error.response.status);
        console.error('Response data:', error.response.data);
      }
      console.log('🔄 ========== SYNC FAILED ==========\n');
    }
  }, [user]);

  /**
   * Request notification permissions with user-friendly prompt
   */
  const requestNotificationPermission = useCallback(async () => {
    console.log('🔔 Checking notification permission status...');
    const statusResponse = await getPermissionStatus();
    setPermissionStatus(statusResponse.status);

    if (statusResponse.status === 'granted') {
      console.log('✅ Notification permissions already granted');
      return true;
    }

    // Show explanation alert before requesting - this is IMPORTANT
    console.log('📢 Showing notification permission alert to user...');
    return new Promise((resolve) => {
      Alert.alert(
        'Enable Notifications',
        'Stay connected! Get notified when you receive:\n\n• New messages\n• New matches\n• Nearby users\n\nTap "Enable" to allow notifications.',
        [
          {
            text: 'Not Now',
            style: 'cancel',
            onPress: () => {
              console.log('❌ User declined notification permission');
              setPermissionStatus('denied');
              resolve(false);
            },
          },
          {
            text: 'Enable',
            onPress: async () => {
              console.log('✅ User tapped Enable - requesting system permission...');
              try {
                const permissionResult = await requestPermissions();
                setPermissionStatus(permissionResult.status);
                
                if (permissionResult.granted) {
                  console.log('✅ System granted notification permission');
                  resolve(true);
                } else {
                  console.warn('❌ System denied notification permission after user accepted');
                  Alert.alert(
                    'Permission Required',
                    'Please enable notifications in your device Settings to receive updates.',
                    [
                      { text: 'OK' },
                      {
                        text: 'Open Settings',
                        onPress: () => openSettings(),
                      },
                    ]
                  );
                  resolve(false);
                }
              } catch (error) {
                console.error('Error requesting permissions:', error);
                resolve(false);
              }
            },
          },
        ],
        { cancelable: false } // Make sure user must respond
      );
    });
  }, []);

  /**
   * Initialize push notifications
   */
  const initializeNotifications = useCallback(async () => {
    if (!user) {
      console.log('⏭️ Skipping notification initialization - no user logged in');
      return;
    }

    try {
      console.log('\n📱 ========== NOTIFICATION INITIALIZATION ==========');
      console.log(`👤 User: ${user.displayName || user.email} (${user._id})`);
      setLoading(true);

      // Check permission status
      console.log('🔍 Step 1: Checking notification permissions...');
      const statusResponse = await getPermissionStatus();
      setPermissionStatus(statusResponse.status);
      console.log(`   Permission status: ${statusResponse.status}`);

      if (statusResponse.status !== 'granted') {
        console.log('⚠️ Permissions not granted, requesting...');
        // Request permissions with user prompt
        const hasPermission = await requestNotificationPermission();
        
        if (!hasPermission) {
          console.warn('❌ Notification permissions not granted by user');
          console.log('📱 ========== INITIALIZATION FAILED (NO PERMISSION) ==========\n');
          setLoading(false);
          return;
        }
        console.log('✅ User granted notification permissions');
      } else {
        console.log('✅ Permissions already granted');
      }

      // Register for push notifications (skip permission check since we already have permission)
      console.log('🔍 Step 2: Registering for push notifications...');
      const token = await registerForPushNotifications(true); // Skip permission check - already granted
      
      if (!token) {
        console.error('❌ Failed to get push token (null returned)');
        console.log('📱 ========== INITIALIZATION FAILED (NO TOKEN) ==========\n');
        setLoading(false);
        return;
      }
      
      console.log(`📋 Received push token: ${token.substring(0, 30)}...`);
      console.log(`📋 Token length: ${token.length} characters`);
      
      if (token && validateToken(token)) {
        console.log('✅ Push token is valid');
        console.log('🔍 Step 3: Setting token in state...');
        setExpoPushToken(token);
        
        console.log('🔍 Step 4: Syncing token with backend...');
        await syncTokenWithBackend(token);
        console.log('✅ Token synced with backend successfully');
        console.log('📱 ========== INITIALIZATION COMPLETE ==========\n');
      } else {
        console.error('❌ Push token validation failed');
        console.error(`   Token: ${token?.substring(0, 50)}...`);
        console.error(`   Is valid: ${token ? validateToken(token) : 'N/A'}`);
        console.log('📱 ========== INITIALIZATION FAILED (INVALID TOKEN) ==========\n');
      }
    } catch (error) {
      console.error('❌ Error initializing notifications:', error);
      console.error('Stack trace:', error.stack);
      console.log('📱 ========== INITIALIZATION FAILED (ERROR) ==========\n');
    } finally {
      setLoading(false);
    }
  }, [user, syncTokenWithBackend, requestNotificationPermission]);

  /**
   * Refresh push token
   */
  const refreshToken = useCallback(async () => {
    try {
      const token = await registerForPushNotifications();
      if (token && validateToken(token)) {
        setExpoPushToken(token);
        await syncTokenWithBackend(token);
      }
    } catch (error) {
      console.error('Error refreshing push token:', error);
    }
  }, [syncTokenWithBackend]);

  // Initialize notifications when user logs in
  useEffect(() => {
    if (user) {
      console.log('👤 User logged in, initializing push notifications for user:', user._id);
      initializeNotifications();
    } else {
      console.log('👤 No user logged in, clearing push token');
      setExpoPushToken(null);
      setPermissionStatus('undetermined');
    }
  }, [user, initializeNotifications]);

  // Set up notification listeners
  useEffect(() => {
    // Handle notifications received while app is in foreground
    notificationListener.current = Notifications.addNotificationReceivedListener(
      (notification) => {
        // Notification received, app is in foreground
        // The notification handler is already configured to show alerts
        console.log('Notification received:', notification);
      }
    );

    // Handle notification taps
    responseListener.current = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        const notification = response.notification;
        console.log('Notification tapped:', notification);

        // Handle navigation
        if (navigationRef?.current) {
          handleNotificationTap(notification, navigationRef.current);
        }
      }
    );

    // Cleanup listeners
    return () => {
      if (notificationListener.current) {
        Notifications.removeNotificationSubscription(notificationListener.current);
      }
      if (responseListener.current) {
        Notifications.removeNotificationSubscription(responseListener.current);
      }
    };
  }, [navigationRef]);

  // Check notification status when app comes to foreground (after user might have enabled in settings)
  useEffect(() => {
    const handleAppStateChange = async (nextAppState) => {
      if (nextAppState === 'active' && user) {
        // App came to foreground - check if permissions changed
        console.log('📱 App came to foreground, checking notification permissions...');
        const statusResponse = await getPermissionStatus();
        
        // If permission status changed from denied to granted, re-initialize
        if (statusResponse.status === 'granted' && permissionStatus !== 'granted') {
          console.log('✅ Notification permissions now granted (user enabled in settings), initializing...');
          setPermissionStatus('granted');
          await initializeNotifications();
        } else if (statusResponse.status !== permissionStatus) {
          // Permission status changed
          setPermissionStatus(statusResponse.status);
          if (statusResponse.status === 'granted' && !expoPushToken) {
            // Permission granted but no token yet
            await initializeNotifications();
          }
        }
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    
    return () => {
      subscription?.remove();
    };
  }, [user, permissionStatus, expoPushToken, initializeNotifications]);

  /**
   * Retry requesting permissions with user prompt
   */
  const retryRequestPermissions = useCallback(async () => {
    try {
      setLoading(true);
      const permissionResult = await requestPermissions(true); // Force request
      setPermissionStatus(permissionResult.status);

      if (!permissionResult.granted) {
        if (permissionResult.status === 'denied' && !permissionResult.canAskAgain) {
          // Permission permanently denied, offer to open settings
          Alert.alert(
            'Permission Denied',
            'Notifications are disabled. To enable them, please go to Settings and allow notifications for this app.',
            [
              { text: 'Cancel', style: 'cancel' },
              {
                text: 'Open Settings',
                onPress: () => openSettings(),
              },
            ]
          );
        } else {
          // Permission denied but can ask again
          Alert.alert(
            'Permission Required',
            'Push notifications help you stay connected. Please allow notifications to receive messages and updates.',
            [
              { text: 'Not Now', style: 'cancel' },
              {
                text: 'Try Again',
                onPress: () => retryRequestPermissions(),
              },
            ]
          );
        }
        setLoading(false);
        return false;
      }

      // Permission granted, register for push token
      const token = await registerForPushNotifications();
      if (token && validateToken(token)) {
        setExpoPushToken(token);
        await syncTokenWithBackend(token);
        setLoading(false);
        return true;
      }
      
      setLoading(false);
      return false;
    } catch (error) {
      console.error('Error retrying permission request:', error);
      setLoading(false);
      return false;
    }
  }, [syncTokenWithBackend]);

  /**
   * Check current notification permission status
   * Useful for checking if user enabled notifications in settings
   */
  const checkPermissionStatus = useCallback(async () => {
    const statusResponse = await getPermissionStatus();
    setPermissionStatus(statusResponse.status);
    
    // If granted but no token, re-initialize
    if (statusResponse.status === 'granted' && !expoPushToken && user) {
      console.log('✅ Notifications enabled in settings, registering push token...');
      await initializeNotifications();
    }
    
    return statusResponse;
  }, [user, expoPushToken, initializeNotifications]);

  const value = {
    expoPushToken,
    permissionStatus,
    loading,
    refreshToken,
    requestPermissions: requestNotificationPermission, // Use the user-friendly version
    retryRequestPermissions,
    initializeNotifications, // Expose for manual initialization
    checkPermissionStatus, // Check current status (useful after returning from settings)
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};

