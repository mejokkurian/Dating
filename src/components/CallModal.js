import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Animated,
  Dimensions,
  Alert,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { RTCView } from 'react-native-webrtc';
import webRTCService from '../services/webrtc';
import socketService from '../services/socket';

const { width, height } = Dimensions.get('window');

/**
 * CallModal Component with WebRTC Integration
 * Real audio and video calls using WebRTC
 * 
 * @param {boolean} visible - Whether the modal is visible
 * @param {Function} onClose - Callback when call ends
 * @param {string} callType - 'audio' or 'video'
 * @param {Object} user - The user being called
 * @param {string} userId - Current user's ID
 * @param {boolean} isIncoming - Whether this is an incoming call
 * @param {Object} incomingOffer - Incoming call offer (for receiver)
 */
const CallModal = ({ visible, onClose, callType, user, userId, isIncoming = false, incomingOffer = null }) => {
  const [callStatus, setCallStatus] = useState(isIncoming ? 'ringing' : 'calling');
  const [callDuration, setCallDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeakerOn, setIsSpeakerOn] = useState(false);
  const [isVideoOn, setIsVideoOn] = useState(callType === 'video');
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [remoteVideoEnabled, setRemoteVideoEnabled] = useState(true);
  
  // Production features
  const [isReconnecting, setIsReconnecting] = useState(false);
  const [networkQuality, setNetworkQuality] = useState('good');

  const pulseAnim = useRef(new Animated.Value(1)).current;
  const durationInterval = useRef(null);

  const mounted = useRef(true);

  // Initialize WebRTC when modal opens (only for outgoing)
  useEffect(() => {
    mounted.current = true;
    if (visible && !isIncoming) {
      initializeCall();
    } else if (!visible) {
      cleanup();
    }

    return () => {
      mounted.current = false;
      cleanup();
    };
  }, [visible, isIncoming]);

  // Setup critical listeners immediately when modal is visible
  // This ensures we can receive call_ended/call_rejected even before accepting
  useEffect(() => {
    if (!visible) return;

    // Listen for call ended (from peer)
    const handleCallEnded = () => {
      console.log('Call ended by peer');
      if (mounted.current) {
        cleanup();
      }
      onClose();
    };

    // Listen for call rejected (from peer)
    const handleCallRejected = () => {
      console.log('Call rejected by peer');
      if (mounted.current) {
        cleanup();
      }
      onClose();
    };

    socketService.onCallEnded(handleCallEnded);
    socketService.onCallRejected(handleCallRejected);

    // Listen for peer video toggle
    const handlePeerVideoToggle = ({ videoEnabled }) => {
      console.log('Peer video toggled:', videoEnabled);
      setRemoteVideoEnabled(videoEnabled);
    };
    
    socketService.addListener('video_toggle', handlePeerVideoToggle);

    return () => {
      socketService.removeListener('call_ended');
      socketService.removeListener('call_rejected');
      socketService.removeListener('video_toggle');
    };
  }, [visible]);

  // Pulse animation for calling state
  useEffect(() => {
    if (callStatus === 'calling' || callStatus === 'ringing') {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.2,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
        ])
      ).start();
    }
  }, [callStatus]);

  // Call duration timer
  useEffect(() => {
    if (callStatus === 'connected') {
      durationInterval.current = setInterval(() => {
        setCallDuration(prev => prev + 1);
      }, 1000);
    } else {
      if (durationInterval.current) {
        clearInterval(durationInterval.current);
      }
    }

    return () => {
      if (durationInterval.current) {
        clearInterval(durationInterval.current);
      }
    };
  }, [callStatus]);

  // Initialize call
  const initializeCall = async () => {
    try {
      // Get local media stream
      const stream = await webRTCService.getLocalStream(callType === 'video', true);
      setLocalStream(stream);

      // Create peer connection with connection state monitoring
      webRTCService.createPeerConnection(
        (remoteStream) => {
          if (!mounted.current) return;
          console.log('Remote stream received');
          setRemoteStream(remoteStream);
          setCallStatus('connected');
          setIsReconnecting(false);
        },
        (candidate) => {
          if (!mounted.current) return;
          // Send ICE candidate to peer
          console.log('Sending ICE candidate');
          socketService.emit('ice_candidate', {
            to: user._id,
            candidate,
          });
        },
        (connectionState) => {
          if (!mounted.current) return;
          // Handle connection state changes
          console.log('Connection state changed:', connectionState);
          
          if (connectionState === 'connected') {
            setCallStatus('connected');
            setIsReconnecting(false);
          } else if (connectionState === 'disconnected' || connectionState === 'reconnecting') {
            setIsReconnecting(true);
          } else if (connectionState === 'failed_permanent') {
            Alert.alert('Call Failed', 'Unable to establish connection');
            handleEndCall();
          }
        }
      );
      
      // Set ICE restart callback for reconnection
      webRTCService.setICERestartCallback((offer) => {
        console.log('ICE restart - sending new offer');
        socketService.emit('webrtc_offer', {
          to: user._id,
          offer,
        });
      });
      
      // Start quality monitoring when connected
      webRTCService.startQualityMonitoring((quality) => {
        if (!mounted.current) return;
        setNetworkQuality(quality.quality);
      });

      // Setup WebRTC event listeners BEFORE creating offer/answer
      setupWebRTCListeners();

      if (isIncoming) {
        if (incomingOffer) {
          // Handle incoming call
          console.log('Handling incoming call, setting remote description');
          await webRTCService.setRemoteDescription(incomingOffer);
          const answer = await webRTCService.createAnswer();
          
          console.log('Sending answer to caller');
          // Send answer to caller
          socketService.emit('webrtc_answer', {
            to: user._id,
            answer,
          });
          
          socketService.emit('call_accepted', { to: user._id });
        } else {
          console.warn('Incoming offer is missing in initializeCall');
          Alert.alert('Connection Error', 'Call connection failed (missing offer).');
          handleEndCall();
        }
      } else {
        // Initiate outgoing call
        console.log('Creating offer for outgoing call');
        const offer = await webRTCService.createOffer();
        
        console.log('Sending offer to callee:', user._id);
        // Send offer to callee
        socketService.emit('webrtc_offer', {
          to: user._id,
          offer,
        });
        
        socketService.emit('call_user', {
          to: user._id,
          from: userId,
          callType,
        });
      }
    } catch (error) {
      // Only show alert/log if it's not a user-cancelled operation (peer connection closed)
      if (!error.message.includes('Peer connection closed')) {
        console.error('Error initializing call:', error);
        Alert.alert('Call Error', 'Failed to initialize call: ' + error.message);
      } else {
        console.log('Call initialization cancelled (peer connection closed)');
      }
      handleEndCall();
    }
  };

  // Setup WebRTC event listeners
  const setupWebRTCListeners = () => {
    // Listen for answer (caller side)
    socketService.onWebRTCAnswer(async ({ answer }) => {
      await webRTCService.setRemoteDescription(answer);
    });

    // Listen for offer (callee side)
    socketService.onWebRTCOffer(async ({ offer }) => {
      await webRTCService.setRemoteDescription(offer);
    });

    // Listen for ICE candidates
    socketService.onICECandidate(async ({ candidate }) => {
      await webRTCService.addIceCandidate(candidate);
    });

    // Listen for call accepted
    socketService.onCallAccepted(() => {
      setCallStatus('connected');
    });
  };

  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleMute = () => {
    const newMutedState = !isMuted;
    setIsMuted(newMutedState);
    webRTCService.toggleAudio(!newMutedState);
  };

  const handleVideoToggle = () => {
    const newVideoState = !isVideoOn;
    setIsVideoOn(newVideoState);
    webRTCService.toggleVideo(newVideoState);
    
    // Notify peer about video toggle
    socketService.emit('video_toggle', {
      to: user._id,
      videoEnabled: newVideoState,
    });
  };

  const handleEndCall = () => {
    // Notify peer
    socketService.emit('end_call', { to: user._id });
    
    cleanup();
    onClose();
  };

  const handleAcceptCall = () => {
    setCallStatus('connecting');
    initializeCall();
  };

  const handleRejectCall = () => {
    socketService.emit('call_rejected', { to: user._id });
    cleanup();
    onClose();
  };

  const cleanup = () => {
    webRTCService.stopQualityMonitoring();
    webRTCService.close();
    setLocalStream(null);
    setRemoteStream(null);
    setCallStatus(isIncoming ? 'ringing' : 'calling');
    setCallDuration(0);
    setIsMuted(false);
    setIsVideoOn(callType === 'video');
    setIsReconnecting(false);
    setNetworkQuality('good');
    
    if (durationInterval.current) {
      clearInterval(durationInterval.current);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      onRequestClose={handleEndCall}
    >
      <View style={styles.callContainer}>
        {/* Remote Video (Full Screen) */}
        {callType === 'video' && remoteStream && remoteVideoEnabled && (
          <RTCView
            streamURL={remoteStream.toURL()}
            style={styles.remoteVideo}
            objectFit="cover"
          />
        )}

        {/* Call Header */}
        <View style={styles.callHeader}>
          <Text style={styles.callTypeText}>
            {callType === 'audio' ? 'Voice Call' : 'Video Call'}
          </Text>
        </View>

        {/* User Info */}
        <View style={styles.userInfoContainer}>
          {(!remoteStream || !remoteVideoEnabled || callType === 'audio') && (
            <>
              <Animated.View style={[
                styles.avatarContainer,
                { transform: [{ scale: callStatus === 'calling' || callStatus === 'ringing' ? pulseAnim : 1 }] }
              ]}>
                {(user?.photos && user.photos.length > 0 
                  ? (user.photos[user.mainPhotoIndex ?? 0] || user.photos[0])
                  : null) || user?.image ? (
                  <Image 
                    source={{ 
                      uri: (user.photos && user.photos.length > 0
                        ? (user.photos[user.mainPhotoIndex ?? 0] || user.photos[0])
                        : null) || user.image
                    }} 
                    style={{ width: 150, height: 150, borderRadius: 75 }} 
                  />
                ) : (
                  <View style={styles.avatarPlaceholder}>
                    <Ionicons name="person" size={80} color="#FFF" />
                  </View>
                )}
              </Animated.View>
              
              <Text style={styles.userName}>{user.name}</Text>
            </>
          )}
          
          <Text style={styles.callStatusText}>
            {callStatus === 'calling' && 'Calling...'}
            {callStatus === 'ringing' && 'Incoming Call...'}
            {callStatus === 'connecting' && 'Connecting...'}
            {isReconnecting && 'Reconnecting...'}
            {callStatus === 'connected' && !isReconnecting && formatDuration(callDuration)}
          </Text>
          
          {/* Network Quality Warning */}
          {callStatus === 'connected' && (networkQuality === 'poor' || networkQuality === 'bad') && (
            <View style={styles.qualityWarning}>
              <Ionicons name="warning" size={16} color="#FF9500" />
              <Text style={styles.qualityWarningText}>
                {networkQuality === 'poor' ? 'Poor connection' : 'Very poor connection'}
              </Text>
            </View>
          )}
          
          {/* Reconnecting Indicator */}
          {isReconnecting && (
            <View style={styles.reconnectingIndicator}>
              <View style={styles.reconnectingDot} />
              <Text style={styles.reconnectingText}>Reconnecting...</Text>
            </View>
          )}
        </View>

        {/* Local Video Preview (for video calls) */}
        {callType === 'video' && localStream && isVideoOn && (
          <View style={styles.localVideoContainer}>
            <RTCView
              streamURL={localStream.toURL()}
              style={styles.localVideo}
              objectFit="cover"
              mirror={true}
            />
          </View>
        )}

        {/* Call Controls */}
        {callStatus === 'ringing' && isIncoming ? (
          // Incoming call buttons
          <View style={styles.incomingCallControls}>
            <TouchableOpacity
              style={styles.rejectButton}
              onPress={handleRejectCall}
            >
              <Ionicons name="close" size={32} color="#FFF" />
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.acceptButton}
              onPress={handleAcceptCall}
            >
              <Ionicons name="call" size={32} color="#FFF" />
            </TouchableOpacity>
          </View>
        ) : (
          // Active call controls
          <View style={styles.callControls}>
            {/* Mute Button */}
            <TouchableOpacity
              style={[styles.controlButton, isMuted && styles.controlButtonActive]}
              onPress={handleMute}
            >
              <Ionicons 
                name={isMuted ? "mic-off" : "mic"} 
                size={28} 
                color={isMuted ? "#FF3B30" : "#FFF"} 
              />
            </TouchableOpacity>

            {/* Speaker Button (audio calls) */}
            {callType === 'audio' && (
              <TouchableOpacity
                style={[styles.controlButton, isSpeakerOn && styles.controlButtonActive]}
                onPress={() => setIsSpeakerOn(!isSpeakerOn)}
              >
                <Ionicons 
                  name={isSpeakerOn ? "volume-high" : "volume-low"} 
                  size={28} 
                  color="#FFF" 
                />
              </TouchableOpacity>
            )}

            {/* Video Toggle (video calls) */}
            {callType === 'video' && (
              <TouchableOpacity
                style={[styles.controlButton, !isVideoOn && styles.controlButtonActive]}
                onPress={handleVideoToggle}
              >
                <Ionicons 
                  name={isVideoOn ? "videocam" : "videocam-off"} 
                  size={28} 
                  color={!isVideoOn ? "#FF3B30" : "#FFF"} 
                />
              </TouchableOpacity>
            )}

            {/* End Call Button */}
            <TouchableOpacity
              style={styles.endCallButton}
              onPress={handleEndCall}
            >
              <Ionicons name="call" size={32} color="#FFF" />
            </TouchableOpacity>
          </View>
        )}
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  callContainer: {
    flex: 1,
    backgroundColor: '#1C1C1E',
    justifyContent: 'space-between',
    paddingVertical: 60,
  },
  remoteVideo: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: width,
    height: height,
  },
  callHeader: {
    alignItems: 'center',
    paddingTop: 20,
    zIndex: 1,
  },
  callTypeText: {
    fontSize: 16,
    color: '#8E8E93',
    fontWeight: '500',
  },
  userInfoContainer: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    zIndex: 1,
  },
  avatarContainer: {
    marginBottom: 30,
  },
  avatarPlaceholder: {
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  userName: {
    fontSize: 32,
    fontWeight: '600',
    color: '#FFF',
    marginBottom: 10,
  },
  callStatusText: {
    fontSize: 18,
    color: '#8E8E93',
  },
  localVideoContainer: {
    position: 'absolute',
    top: 100,
    right: 20,
    width: 120,
    height: 160,
    borderRadius: 12,
    overflow: 'hidden',
    zIndex: 2,
  },
  localVideo: {
    width: '100%',
    height: '100%',
  },
  callControls: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 20,
    paddingHorizontal: 40,
    zIndex: 1,
  },
  incomingCallControls: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 60,
    paddingHorizontal: 40,
    zIndex: 1,
  },
  controlButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#2C2C2E',
    justifyContent: 'center',
    alignItems: 'center',
  },
  controlButtonActive: {
    backgroundColor: '#3A3A3C',
  },
  endCallButton: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#FF3B30',
    justifyContent: 'center',
    alignItems: 'center',
    transform: [{ rotate: '135deg' }],
  },
  acceptButton: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#4CD964',
    justifyContent: 'center',
    alignItems: 'center',
  },
  rejectButton: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#FF3B30',
    justifyContent: 'center',
    alignItems: 'center',
  },
  qualityWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: 'rgba(255, 149, 0, 0.2)',
    borderRadius: 20,
    gap: 6,
  },
  qualityWarningText: {
    color: '#FF9500',
    fontSize: 14,
    fontWeight: '500',
  },
  reconnectingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    gap: 8,
  },
  reconnectingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FF9500',
  },
  reconnectingText: {
    color: '#FF9500',
    fontSize: 14,
    fontWeight: '500',
  },
});

export default CallModal;
