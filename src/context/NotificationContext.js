/**
 * Notification Context
 * Manages global notification state and push token registration
 */
import React, { createContext, useState, useContext, useEffect, useCallback, useRef } from 'react';
import * as Notifications from 'expo-notifications';
import { useAuth } from './AuthContext';
import {
  requestPermissions,
  getPermissionStatus,
  registerForPushNotifications,
  validateToken,
  clearBadge,
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
      return;
    }

    try {
      await registerPushToken(token);
      console.log('Push token synced with backend');
    } catch (error) {
      console.error('Error syncing push token with backend:', error);
    }
  }, [user]);

  /**
   * Initialize push notifications
   */
  const initializeNotifications = useCallback(async () => {
    if (!user) {
      return;
    }

    try {
      setLoading(true);

      // Check permission status
      const status = await getPermissionStatus();
      setPermissionStatus(status);

      if (status !== 'granted') {
        // Request permissions
        const permissionResult = await requestPermissions();
        setPermissionStatus(permissionResult.status);

        if (!permissionResult.granted) {
          console.warn('Notification permissions not granted');
          setLoading(false);
          return;
        }
      }

      // Register for push notifications
      const token = await registerForPushNotifications();
      if (token && validateToken(token)) {
        setExpoPushToken(token);
        await syncTokenWithBackend(token);
      } else {
        console.warn('Failed to get valid push token');
      }
    } catch (error) {
      console.error('Error initializing notifications:', error);
    } finally {
      setLoading(false);
    }
  }, [user, syncTokenWithBackend]);

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
      initializeNotifications();
    } else {
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

  // Clear badge when app comes to foreground (optional)
  useEffect(() => {
    const subscription = Notifications.addNotificationReceivedListener(() => {
      // Badge will be updated by the system
    });

    return () => {
      Notifications.removeNotificationSubscription(subscription);
    };
  }, []);

  const value = {
    expoPushToken,
    permissionStatus,
    loading,
    refreshToken,
    requestPermissions,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};

