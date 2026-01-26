import React, { useRef, useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as Notifications from 'expo-notifications';
import { AuthProvider } from './src/context/AuthContext';
import { CallProvider, useCall } from './src/context/CallContext';
import { BadgeProvider } from './src/context/BadgeContext';
import { NotificationProvider } from './src/context/NotificationContext';
import AuthNavigator from './src/navigation/AuthNavigator';
import Toast from 'react-native-toast-message';
import { initCache } from './src/services/MessageCache';

// Configure notification handler for foreground notifications
Notifications.setNotificationHandler({
  handleNotification: async (notification) => {
    const notificationType = notification.request.content.data?.type;
    
    // For call notifications, show alert-style notification
    // Note: Tapping foreground notifications doesn't trigger addNotificationResponseReceivedListener
    // We handle foreground call notifications in CallContext.addNotificationReceivedListener
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

// Inner component to access CallContext
const AppContent = ({ navigationRef }) => {
  const { isCallActiveForUser, callState } = useCall();
  const callStateRef = useRef(callState);
  const isCallActiveForUserRef = useRef(isCallActiveForUser);

  // Keep refs updated
  useEffect(() => {
    callStateRef.current = callState;
    isCallActiveForUserRef.current = isCallActiveForUser;
  }, [callState, isCallActiveForUser]);

  useEffect(() => {
    console.log('📱 Setting up notification response listener (singleton)...');
    
    // Background notification handler - handles notification taps
    // This listener persists and doesn't get removed/re-added on re-renders
    const subscription = Notifications.addNotificationResponseReceivedListener(async (response) => {
      const notification = response.notification;
      const data = notification.request.content.data;
      
      console.log('📱 ========== NOTIFICATION TAPPED ==========');
      console.log('📱 Notification data:', JSON.stringify(data, null, 2));
      console.log('📱 Navigation ref ready:', navigationRef.current?.isReady());
      
      // Handle call notification tap
      if (data?.type === 'call') {
        const { callerId, callerName, callType, timestamp } = data;
        console.log('📞 Call notification tapped for caller:', callerId);
        console.log('📞 Caller name:', callerName);
        
        // Wait for navigation to be ready (with retries)
        let retries = 0;
        const maxRetries = 10;
        while (!navigationRef.current?.isReady() && retries < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, 200));
          retries++;
          console.log(`⏳ Waiting for navigation (attempt ${retries}/${maxRetries})...`);
        }
        
        if (!navigationRef.current?.isReady()) {
          console.error('❌ Navigation not ready after waiting');
          return;
        }
        
        console.log('✅ Navigation is ready');
        
        // Check if call is still active for this caller (use ref to get latest state)
        const callActive = isCallActiveForUserRef.current(callerId);
        const currentCallState = callStateRef.current;
        console.log('📞 Call active for user:', callActive);
        console.log('📞 Current call state:', currentCallState);
        
        try {
          if (callActive) {
            console.log('✅ Call is still active, navigating to Messages tab');
            // Navigate to Messages tab - CallContext will show the call modal
            navigationRef.current.navigate('MainTab', {
              screen: 'Messages',
            });
          } else {
            console.log('ℹ️ Call has ended or not active, navigating to chat screen');
            // Navigate to Messages tab first
            navigationRef.current.navigate('MainTab', {
              screen: 'Messages',
            });
            
            // Small delay to ensure Messages tab is loaded, then navigate to Chat
            setTimeout(() => {
              if (navigationRef.current?.isReady()) {
                console.log('📱 Navigating to Chat screen with user:', callerId);
                navigationRef.current.navigate('Chat', {
                  user: {
                    _id: callerId,
                    name: callerName || 'Unknown',
                  },
                });
              } else {
                console.error('❌ Navigation not ready for Chat screen');
              }
            }, 500);
          }
        } catch (error) {
          console.error('❌ Error navigating from notification:', error);
        }
      }
      
      console.log('📱 ========== END NOTIFICATION HANDLER ==========');
    });

    console.log('✅ Notification response listener registered (persists across re-renders)');

    // Only remove on unmount, not on re-renders
    return () => {
      console.log('📱 Removing notification response listener (AppContent unmounting)');
      subscription.remove();
    };
  }, []); // Empty deps - listener persists across re-renders

  return null;
};

export default function App() {
  const navigationRef = useRef(null);

  useEffect(() => {
    // Initialize message cache
    initCache();
    
    // Check for pending notification when app starts (e.g., app was killed and user tapped notification)
    const checkPendingNotification = async () => {
      try {
        const lastResponse = await Notifications.getLastNotificationResponseAsync();
        if (lastResponse) {
          console.log('📱 Found pending notification response from app launch');
          const data = lastResponse.notification.request.content.data;
          
          // Handle call notification if present
          if (data?.type === 'call') {
            console.log('📞 Processing pending call notification...');
            // Wait a bit for navigation to be ready
            setTimeout(async () => {
              if (navigationRef.current?.isReady()) {
                const { callerId, callerName } = data;
                console.log('📱 Navigating from pending notification to Messages');
                navigationRef.current.navigate('MainTab', {
                  screen: 'Messages',
                });
                
                // Navigate to chat after delay (call likely ended)
                setTimeout(() => {
                  if (navigationRef.current?.isReady()) {
                    navigationRef.current.navigate('Chat', {
                      user: {
                        _id: callerId,
                        name: callerName || 'Unknown',
                      },
                    });
                  }
                }, 500);
              }
            }, 1000);
          }
        }
      } catch (error) {
        console.error('❌ Error checking pending notification:', error);
      }
    };
    
    // Check after a short delay to ensure navigation is ready
    setTimeout(checkPendingNotification, 500);
  }, []);

  return (
    <SafeAreaProvider>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <AuthProvider>
          <BadgeProvider>
            <NotificationProvider navigationRef={navigationRef}>
              <CallProvider>
                <AppContent navigationRef={navigationRef} />
                <AuthNavigator navigationRef={navigationRef} />
              </CallProvider>
            </NotificationProvider>
          </BadgeProvider>
        </AuthProvider>
      </GestureHandlerRootView>
      <Toast />
    </SafeAreaProvider>
  );
}
