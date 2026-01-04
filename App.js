import React, { useRef, useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as Notifications from 'expo-notifications';
import { AuthProvider } from './src/context/AuthContext';
import { CallProvider } from './src/context/CallContext';
import { BadgeProvider } from './src/context/BadgeContext';
import { NotificationProvider } from './src/context/NotificationContext';
import AuthNavigator from './src/navigation/AuthNavigator';

// Configure notification handler for foreground notifications
Notifications.setNotificationHandler({
  handleNotification: async (notification) => {
    const notificationType = notification.request.content.data?.type;
    
    // For call notifications, show alert-style notification
    if (notificationType === 'call') {
      return {
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
        priority: Notifications.AndroidNotificationPriority.MAX,
      };
    }
    
    // For other notifications, use default behavior
    return {
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
    };
  },
});

export default function App() {
  const navigationRef = useRef(null);

  useEffect(() => {
    // Background notification handler
    const subscription = Notifications.addNotificationResponseReceivedListener(response => {
      const notification = response.notification;
      const data = notification.request.content.data;
      
      console.log('📱 Notification tapped:', data);
      
      // Handle call notification tap
      if (data?.type === 'call') {
        console.log('📞 Call notification tapped, opening call UI...');
        // The CallContext will handle showing the call modal
        // when the socket event is received
      }
    });

    return () => subscription.remove();
  }, []);

  return (
    <SafeAreaProvider>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <AuthProvider>
          <BadgeProvider>
            <NotificationProvider navigationRef={navigationRef}>
              <CallProvider>
                <AuthNavigator navigationRef={navigationRef} />
              </CallProvider>
            </NotificationProvider>
          </BadgeProvider>
        </AuthProvider>
      </GestureHandlerRootView>
    </SafeAreaProvider>
  );
}
