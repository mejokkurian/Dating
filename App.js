import React, { useRef } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { AuthProvider } from './src/context/AuthContext';
import { CallProvider } from './src/context/CallContext';
import { BadgeProvider } from './src/context/BadgeContext';
import { NotificationProvider } from './src/context/NotificationContext';
import AuthNavigator from './src/navigation/AuthNavigator';

export default function App() {
  const navigationRef = useRef(null);

  return (
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
  );
}
