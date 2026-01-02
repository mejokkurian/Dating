import React, { createContext, useState, useEffect, useContext, useRef } from 'react';
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import socketService from '../services/socket';
import webRTCService from '../services/webrtc';
import { useAuth } from './AuthContext';
import CallModal from '../components/CallModal';
import { getUserById } from '../services/api/user';

const CallContext = createContext({});

export const useCall = () => {
  const context = useContext(CallContext);
  if (!context) {
    throw new Error('useCall must be used within CallProvider');
  }
  return context;
};

export const CallProvider = ({ children }) => {
  const { user } = useAuth();
  const [callState, setCallState] = useState({
    visible: false,
    callType: null, // 'audio' or 'video'
    user: null, // The other user
    isIncoming: false,
    incomingOffer: null,
  });

  // Reset state helper
  const resetCallState = () => {
    setCallState({
      visible: false,
      callType: null,
      user: null,
      isIncoming: false,
      incomingOffer: null,
    });
  };

  const callStateRef = useRef(callState);

  useEffect(() => {
    callStateRef.current = callState;
  }, [callState]);

  useEffect(() => {
    if (!user?._id) return;

    if (!socketService.connected) {
      socketService.connect();
    }

    // Listen for incoming calls
    const handleIncomingCall = async (data) => {
      console.log('📞 ========== INCOMING CALL EVENT ==========');
      console.log('📞 Platform:', Platform.OS);
      console.log('📞 Data received:', JSON.stringify(data, null, 2));
      console.log('📞 Current callState.visible:', callStateRef.current.visible);
      
      const { from, callType } = data;
      
      // Check latest state using ref to avoid closure staleness and race conditions
      if (callStateRef.current.visible) {
        console.log('⚠️ Call already active, sending busy signal');
        socketService.emit('call_busy', { to: from });
        return;
      }

      console.log('📞 Setting call state to visible...');
      // Show call immediately with placeholder
      setCallState(prev => {
        console.log('📞 Previous state:', prev);
        // Double check inside setter just in case
        if (prev.visible) {
          console.log('⚠️ State already visible, not updating');
          return prev;
        }
        
        const newState = {
          visible: true,
          callType: callType || 'audio',
          user: { _id: from, name: 'Unknown Caller', image: null },
          isIncoming: true,
          incomingOffer: prev.incomingOffer || null,
        };
        console.log('📞 New state:', newState);
        return newState;
      });

      console.log('📞 Fetching caller details...');
      // Fetch caller details in background
      try {
        const userDoc = await getUserById(from);
        console.log('📞 Caller details fetched:', userDoc?.displayName || userDoc?.name);
        if (userDoc) {
          setCallState(prev => {
            if (prev.visible && prev.user?._id === from) {
              return { ...prev, user: userDoc };
            }
            return prev;
          });
        }
      } catch (error) {
        console.error('❌ Error fetching caller details:', error);
      }
      console.log('📞 ========== END INCOMING CALL EVENT ==========');
    };

    socketService.onIncomingCall(handleIncomingCall);

    // Listen for WebRTC offer
    const handleWebRTCOffer = ({ offer, from }) => {
      console.log('📞 WebRTC Offer received');
      setCallState(prev => {
        if (prev.visible && prev.user?._id === from) {
          return { ...prev, incomingOffer: offer };
        }
        return { ...prev, incomingOffer: offer };
      });
    };

    socketService.onWebRTCOffer(handleWebRTCOffer);

    // Listen for push notifications (when app is in background/closed)
    const notificationSubscription = Notifications.addNotificationReceivedListener(async (notification) => {
      const data = notification.request.content.data;
      console.log('📱 Push notification received:', data);
      
      // Handle incoming call notification
      if (data?.type === 'call') {
        console.log('📞 Call notification received in background!');
        const { callerId, callerName, callType } = data;
        
        // Check if call modal is already visible
        if (callStateRef.current.visible) {
          console.log('⚠️ Call already active, ignoring notification');
          return;
        }

        console.log('📞 Opening call UI from notification...');
        // Show call UI immediately
        setCallState({
          visible: true,
          callType: callType || 'audio',
          user: { _id: callerId, name: callerName || 'Unknown Caller', image: null },
          isIncoming: true,
          incomingOffer: null,
        });

        // Fetch full caller details in background
        try {
          const userDoc = await getUserById(callerId);
          if (userDoc) {
            setCallState(prev => {
              if (prev.visible && prev.user?._id === callerId) {
                return { ...prev, user: userDoc };
              }
              return prev;
            });
          }
        } catch (error) {
          console.error('❌ Error fetching caller details from notification:', error);
        }
      }
    });

    return () => {
      socketService.removeListener('incoming_call');
      socketService.removeListener('webrtc_offer');
      notificationSubscription.remove();
    };
  }, [user?._id]); // Removed callState dependency to avoid listener thrashing

  const startCall = (targetUser, type = 'audio') => {
    setCallState({
      visible: true,
      callType: type,
      user: targetUser,
      isIncoming: false,
      incomingOffer: null,
    });
  };

  const endCall = () => {
    resetCallState();
  };

  return (
    <CallContext.Provider value={{ startCall, endCall, callState }}>
      {children}
      {/* Global Call Modal */}
      {callState.visible && (
        <CallModal
          visible={callState.visible}
          onClose={endCall}
          callType={callState.callType}
          user={callState.user}
          userId={user?._id}
          isIncoming={callState.isIncoming}
          incomingOffer={callState.incomingOffer}
        />
      )}
    </CallContext.Provider>
  );
};
