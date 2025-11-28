import React from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { AuthProvider } from './src/context/AuthContext';
import { CallProvider } from './src/context/CallContext';
import AuthNavigator from './src/navigation/AuthNavigator';

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AuthProvider>
        <CallProvider>
          <AuthNavigator />
        </CallProvider>
      </AuthProvider>
    </GestureHandlerRootView>
  );
}
