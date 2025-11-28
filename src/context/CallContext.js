import React, { createContext, useState, useEffect, useContext, useRef } from 'react';
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
      console.log('📞 Incoming call received:', data);
      const { from, callType } = data;
      
      // Check latest state using ref to avoid closure staleness and race conditions
      if (callStateRef.current.visible) {
        console.log('⚠️ Call already active, sending busy signal');
        socketService.emit('call_busy', { to: from });
        return;
      }

      // Show call immediately with placeholder
      setCallState(prev => {
        // Double check inside setter just in case
        if (prev.visible) return prev;
        
        return {
          visible: true,
          callType: callType || 'audio',
          user: { _id: from, name: 'Unknown Caller', image: null },
          isIncoming: true,
          incomingOffer: prev.incomingOffer || null,
        };
      });

      // Fetch caller details in background
      try {
        const userDoc = await getUserById(from);
        if (userDoc) {
          setCallState(prev => {
            if (prev.visible && prev.user?._id === from) {
              return { ...prev, user: userDoc };
            }
            return prev;
          });
        }
      } catch (error) {
        console.error('Error fetching caller details:', error);
      }
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

    return () => {
      socketService.removeListener('incoming_call');
      socketService.removeListener('webrtc_offer');
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
