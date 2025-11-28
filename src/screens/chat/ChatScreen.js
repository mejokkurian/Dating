import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  Image,
  ActivityIndicator,
  Animated,
  Easing,
  PanResponder,
  Modal,
  TouchableWithoutFeedback,
  Alert,
} from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import { Ionicons } from '@expo/vector-icons';
import { Audio } from 'expo-av';
import { getMessages } from '../../services/api/chat';
import socketService from '../../services/socket';
import { useAuth } from '../../context/AuthContext';
import { useCall } from '../../context/CallContext';
import api from '../../services/api/config';

// Helper function
const formatTime = (date) => {
  const d = new Date(date);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

// Audio Message Component
const AudioMessage = ({ audioUrl, duration, isMine }) => {
  const [sound, setSound] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackPosition, setPlaybackPosition] = useState(0);
  const [playbackDuration, setPlaybackDuration] = useState(duration || 0);
  const [playbackRate, setPlaybackRate] = useState(1.0);

  const playSound = async () => {
    try {
      if (!audioUrl) {
        alert('Audio URL is missing');
        return;
      }

      if (sound) {
        await sound.unloadAsync();
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
      });

      const { sound: newSound } = await Audio.Sound.createAsync(
        { uri: audioUrl },
        { shouldPlay: true, rate: playbackRate },
        (status) => {
          if (status.isLoaded) {
            setPlaybackPosition(status.positionMillis / 1000);
            setPlaybackDuration(status.durationMillis / 1000);
            if (status.didJustFinish) {
              setIsPlaying(false);
              setPlaybackPosition(0);
            }
          }
        }
      );
      
      setSound(newSound);
      setIsPlaying(true);
    } catch (error) {
      console.error('Error playing sound:', error);
      setIsPlaying(false);
    }
  };

  const stopSound = async () => {
    if (sound) {
      await sound.pauseAsync();
      setIsPlaying(false);
    }
  };

  const seekToPosition = async (position) => {
    if (sound) {
      await sound.setPositionAsync(position * 1000);
      setPlaybackPosition(position);
    }
  };

  const togglePlaybackRate = async () => {
    const rates = [1.0, 1.5, 2.0];
    const currentIndex = rates.indexOf(playbackRate);
    const nextRate = rates[(currentIndex + 1) % rates.length];
    setPlaybackRate(nextRate);
    
    if (sound) {
      await sound.setRateAsync(nextRate, true);
    }
  };

  const handleProgressTap = (evt) => {
    const { locationX } = evt.nativeEvent;
    // approximate width 250
    const newPosition = (locationX / 250) * playbackDuration;
    seekToPosition(Math.max(0, Math.min(newPosition, playbackDuration)));
  };

  useEffect(() => {
    return sound
      ? () => {
          sound.unloadAsync();
        }
      : undefined;
  }, [sound]);

  const formatAudioTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const progress = playbackDuration > 0 ? playbackPosition / playbackDuration : 0;

  return (
    <View style={[
      styles.audioMessageContainer,
      isMine ? styles.audioMessageMine : styles.audioMessageTheirs
    ]}>
      <TouchableOpacity 
        onPress={isPlaying ? stopSound : playSound}
        style={[
          styles.audioPlayButton,
          isMine ? styles.audioPlayButtonMine : styles.audioPlayButtonTheirs
        ]}
      >
        <Ionicons 
          name={isPlaying ? "pause" : "play"} 
          size={20} 
          color={isMine ? "#FFF" : "#000"} 
        />
      </TouchableOpacity>

      <View style={styles.audioContent}>
        <TouchableOpacity 
          style={styles.audioWaveformContainer}
          onPress={handleProgressTap}
          activeOpacity={0.7}
        >
          <View style={styles.audioProgressBackground} />
          <View 
            style={[
              styles.audioProgressFill,
              { 
                width: `${progress * 100}%`,
                backgroundColor: isMine ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.3)'
              }
            ]} 
          />
          <View style={styles.audioWaveform}>
            {[3, 5, 4, 6, 3, 5, 7, 4, 5, 3, 6, 4, 5, 3, 7, 5, 4, 6].map((height, index) => (
              <View
                key={index}
                style={[
                  styles.audioBar,
                  { 
                    height: `${height * 10}%`,
                    backgroundColor: isMine ? '#FFF' : '#000',
                    opacity: (index / 18) < progress ? 0.8 : 0.3
                  }
                ]}
              />
            ))}
          </View>
        </TouchableOpacity>
        
        <View style={styles.audioControls}>
          <Text style={[
            styles.audioTime,
            isMine ? styles.audioTimeMine : styles.audioTimeTheirs
          ]}>
            {isPlaying ? formatAudioTime(playbackPosition) : formatAudioTime(playbackDuration)}
          </Text>
          
          <TouchableOpacity 
            onPress={togglePlaybackRate}
            style={styles.speedButton}
          >
            <Text style={[
              styles.speedText,
              isMine ? styles.speedTextMine : styles.speedTextTheirs
            ]}>
              {playbackRate}x
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

// Swipeable Message Component
const SwipeableMessage = ({ children, onReply, isMine, onSwipeableOpen }) => {
  const swipeableRef = useRef(null);

  const renderRightActions = (progress, dragX) => {
    const scale = dragX.interpolate({
      inputRange: [-80, 0],
      outputRange: [1, 0],
      extrapolate: 'clamp',
    });

    return (
      <View style={styles.replyActionContainer}>
        <Animated.View style={[styles.replyActionIcon, { transform: [{ scale }] }]}>
          <Ionicons name="arrow-undo" size={24} color="#007AFF" />
        </Animated.View>
      </View>
    );
  };

  const handleReply = () => {
    onReply();
    // Close the swipeable after triggering reply
    if (swipeableRef.current) {
      swipeableRef.current.close();
    }
  };

  return (
    <Swipeable
      ref={swipeableRef}
      renderRightActions={renderRightActions}
      onSwipeableOpen={handleReply}
      onSwipeableWillOpen={() => onSwipeableOpen && onSwipeableOpen(swipeableRef.current)}
      friction={2}
      rightThreshold={40}
      containerStyle={styles.swipeableContainer}
    >
      <View style={{ width: '100%', alignItems: isMine ? 'flex-end' : 'flex-start', paddingHorizontal: 16 }}>
        {children}
      </View>
    </Swipeable>
  );
};

// Memoized Message Item Component
const MessageItem = React.memo(({ item, userData, user, handleLongPress, setReplyToMessage, onSwipeableOpen }) => {
  const isMine = item.senderId._id === userData._id;
  const isOptimistic = item.isOptimistic;
  const isFailed = item.status === 'failed';
  const isDeleted = item.deletedForEveryone;

  if (item.deletedFor?.includes(userData._id)) {
    return null;
  }

  const messageContent = (
    <TouchableOpacity
      onLongPress={() => handleLongPress(item)}
      delayLongPress={200}
      activeOpacity={0.9}
    >
      {item.isPinned && (
        <View style={[
          styles.pinnedIndicator,
          isMine ? styles.pinnedIndicatorMine : styles.pinnedIndicatorTheirs
        ]}>
          <Ionicons name="pin" size={14} color="#B8860B" />
          <Text style={styles.pinnedLabel}>Pinned</Text>
        </View>
      )}

      <View
        style={[
          styles.messageBubble,
          isMine ? styles.myMessage : styles.theirMessage,
          isFailed && styles.failedMessage,
          item.isPinned && styles.pinnedBubble
        ]}
      >

        {item.replyTo && (
          <View style={[
            styles.replyContext, 
            isMine ? styles.replyContextMine : styles.replyContextTheirs
          ]}>
            <View style={[
              styles.replyBorder, 
              { backgroundColor: isMine ? 'rgba(255,255,255,0.5)' : '#007AFF' }
            ]} />
            <View style={styles.replyContentWrapper}>
              <Text style={[
                styles.replySenderName, 
                { color: isMine ? 'rgba(255,255,255,0.9)' : '#007AFF' }
              ]}>
                {item.replyTo.senderId?._id === userData._id ? 'You' : (item.replyTo.senderId?.displayName || user.name)}
              </Text>
              {item.replyTo.messageType === 'audio' ? (
                <View style={styles.replyAudioPreview}>
                  <Ionicons 
                    name="mic" 
                    size={12} 
                    color={isMine ? 'rgba(255,255,255,0.7)' : '#666'} 
                  />
                  <Text style={[
                    styles.replyMessageText, 
                    { color: isMine ? 'rgba(255,255,255,0.7)' : '#666' }
                  ]}>
                    Voice message
                  </Text>
                </View>
              ) : (
                <Text 
                  style={[
                    styles.replyMessageText, 
                    { color: isMine ? 'rgba(255,255,255,0.7)' : '#666' }
                  ]} 
                  numberOfLines={2}
                  ellipsizeMode="tail"
                >
                  {item.replyTo.content}
                </Text>
              )}
            </View>
          </View>
        )}

        {isDeleted ? (
          <Text style={[styles.messageText, isMine ? styles.myMessageText : styles.theirMessageText, { fontStyle: 'italic', opacity: 0.6, fontSize: 12, paddingHorizontal: 0 }]}>
            <Ionicons name="ban" size={11} /> This message was deleted
          </Text>
        ) : item.messageType === 'audio' ? (
          <AudioMessage 
            audioUrl={item.audioUrl} 
            duration={item.audioDuration} 
            isMine={isMine} 
          />
        ) : (
          <Text style={[styles.messageText, isMine ? styles.myMessageText : styles.theirMessageText]}>
            {item.content}
          </Text>
        )}

        <View style={styles.messageFooter}>
          {item.starredBy?.includes(userData._id) && (
            <Ionicons name="star" size={10} color="#FFD700" style={{ marginRight: 4 }} />
          )}
          <Text style={styles.timestampInBubble}>
            {formatTime(item.createdAt)}
          </Text>
          {isMine && (
            <View style={styles.statusContainer}>
              {isOptimistic ? (
                item.status === 'uploading' ? (
                  <ActivityIndicator size="small" color="rgba(255,255,255,0.5)" style={{ transform: [{ scale: 0.5 }], marginLeft: 4 }} />
                ) : (
                  <Ionicons name="time-outline" size={10} color="rgba(255,255,255,0.5)" style={{ marginLeft: 4 }} />
                )
              ) : isFailed ? (
                <Ionicons name="alert-circle" size={10} color="#FF4444" style={{ marginLeft: 4 }} />
              ) : (
                <Ionicons 
                  name={item.status === 'read' ? "checkmark-done" : "checkmark"} 
                  size={12} 
                  color={item.status === 'read' ? "#34C759" : "rgba(255,255,255,0.5)"} 
                  style={{ marginLeft: 4 }}
                />
              )}
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <SwipeableMessage 
      onReply={() => setReplyToMessage(item)}
      isMine={isMine}
      onSwipeableOpen={onSwipeableOpen}
    >
      {messageContent}
    </SwipeableMessage>
  );
});

const ChatScreen = ({ route, navigation }) => {
  const { user, matchStatus, isInitiator } = route.params;
  const { userData } = useAuth();
  const { startCall, callState } = useCall();
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(true);
  const [isTyping, setIsTyping] = useState(false);
  const [isOtherUserInChat, setIsOtherUserInChat] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isRemoteRecording, setIsRemoteRecording] = useState(false);
  const [recording, setRecording] = useState(null);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [slideX, setSlideX] = useState(0); // Track slide position
  const [showHoldHint, setShowHoldHint] = useState(false);
  
  // Message Actions State
  const [selectedMessage, setSelectedMessage] = useState(null);
  const [showActionSheet, setShowActionSheet] = useState(false);
  const [replyToMessage, setReplyToMessage] = useState(null);
  const [pinnedMessage, setPinnedMessage] = useState(null);
  
  // Pagination State
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  const flatListRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const recordingIntervalRef = useRef(null);
  const recordingRef = useRef(null); // Use ref to track recording object
  const isRecordingOperationInProgress = useRef(false); // Prevent concurrent operations
  const openSwipeableRef = useRef(null); // Track currently open swipeable

  const handleSwipeableOpen = useCallback((ref) => {
    if (openSwipeableRef.current && openSwipeableRef.current !== ref) {
      openSwipeableRef.current.close();
    }
    openSwipeableRef.current = ref;
  }, []);
  const hintOpacity = useRef(new Animated.Value(0)).current;
  

  // Cleanup any orphaned recordings on mount
  useEffect(() => {
    // Cleanup on unmount
    return () => {
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
        recordingIntervalRef.current = null;
      }
      if (recordingRef.current) {
        recordingRef.current.stopAndUnloadAsync().catch(() => {});
        recordingRef.current = null;
      }
      isRecordingOperationInProgress.current = false;
    };
  }, []);

  useEffect(() => {
    let mounted = true;

    const initSocket = async () => {
      await socketService.connect();
      
      if (!mounted) return;

      // Join chat room to notify other user
      socketService.joinChat(user._id);

      // Listen for new messages
      socketService.onNewMessage((message) => {
        if (message.senderId._id === user._id || message.receiverId === user._id) {
          setMessages((prev) => {
            // Check for duplicates
            const existingIndex = prev.findIndex(m => m._id === message._id || (message.tempId && m.tempId === message.tempId));
            
            if (existingIndex !== -1) {
              // Update existing message
              const newMessages = [...prev];
              newMessages[existingIndex] = { ...newMessages[existingIndex], ...message };
              return newMessages;
            }
            
            // For inverted list, new messages go to START (bottom of screen)
            // Check if message already exists (by _id or tempId)
          const exists = prev.some(m => 
            m._id === message._id || 
            (m.tempId && m.tempId === message.tempId)
          );

          if (exists) {
            // Update existing message instead of appending
            return prev.map(m => 
              (m._id === message._id || (m.tempId && m.tempId === message.tempId))
                ? message 
                : m
            );
          }
          
          return [message, ...prev];
        });
          
          // Acknowledge delivery if it's from the other user
          if (message.senderId._id === user._id) {
            socketService.ackDelivered(message._id, message.senderId._id);
            socketService.markAsRead(message.conversationId);
          }
        }
      });

      // Listen for message sent confirmation (update temp ID)
      socketService.onMessageSent((message) => {
        setMessages((prev) => {
          // Check if the real message was already added by onNewMessage (race condition)
          const realMessageExists = prev.some(m => m._id === message._id);
          
          if (realMessageExists) {
            // If real message exists, remove the optimistic one to avoid duplicates
            return prev.filter(m => m.tempId !== message.tempId);
          }
          
          // Otherwise, update the optimistic message with real data
          return prev.map((m) => (m.tempId === message.tempId ? message : m));
        });
      });

      // Listen for delivery updates
      socketService.onMessageDelivered(({ messageId, status }) => {
        setMessages((prev) =>
          prev.map((m) => (m._id === messageId ? { ...m, status } : m))
        );
      });

      // Listen for read updates
      socketService.onMessagesRead(({ conversationId }) => {
        setMessages((prev) =>
          prev.map((m) => 
            m.conversationId === conversationId && m.senderId._id === userData._id
              ? { ...m, status: 'read', read: true } 
              : m
          )
        );
      });

      // Listen for typing indicator
      socketService.onUserTyping(({ userId, isTyping }) => {
        if (userId === user._id) {
          setIsTyping(isTyping);
        }
      });

      // Listen for recording indicator
      socketService.onUserRecording(({ userId, isRecording }) => {
        if (userId === user._id) {
          setIsRemoteRecording(isRecording);
        }
      });

      // Listen for presence (joined chat)
      socketService.onUserJoinedChat(({ userId }) => {
        if (userId === user._id) {
          setIsOtherUserInChat(true);
          // Acknowledge presence so they know we are here too
          socketService.sendPresenceAck(user._id);
        }
      });

      // Listen for presence (left chat)
      socketService.onUserLeftChat(({ userId }) => {
        if (userId === user._id) {
          setIsOtherUserInChat(false);
        }
      });

      // Listen for presence acknowledgment
      socketService.onPresenceAck(({ userId }) => {
        if (userId === user._id) {
          setIsOtherUserInChat(true);
        }
      });

      // Listen for pinned messages
      socketService.onMessagePinned((data) => {
        const { messageId, isPinned, pinnedMessage: updatedMessage } = data;
        
        // Update local messages state
        setMessages(prev => prev.map(msg => 
          msg._id === messageId ? { ...msg, isPinned } : msg
        ));

        // Update pinned message state
        if (isPinned && updatedMessage) {
          setPinnedMessage(updatedMessage);
        } else if (!isPinned && pinnedMessage?._id === messageId) {
          setPinnedMessage(null);
        }
      });

      // Listen for starred messages
      socketService.onMessageStarred((data) => {
        const { messageId, isStarred, starredBy } = data;
        
        // Update local messages state
        setMessages(prev => prev.map(msg => 
          msg._id === messageId ? { ...msg, starredBy } : msg
        ));
      });

      // Listen for deleted messages
      socketService.onMessageDeleted((data) => {
        const { messageId, deletedForEveryone } = data;
        
        setMessages(prev => prev.map(msg => {
          if (msg._id === messageId) {
            if (deletedForEveryone) {
              return { ...msg, deletedForEveryone: true, content: 'This message was deleted' };
            }
            // For "delete for me", we filter it out in the render or mark it
            return { ...msg, deletedFor: [...(msg.deletedFor || []), userData._id] };
          }
          return msg;
        }));
      });
    };

    loadMessages();
    initSocket();

    return () => {
      mounted = false;
      socketService.removeListener('new_message');
      socketService.removeListener('message_sent');
      socketService.removeListener('message_delivered');
      socketService.removeListener('messages_read');
      socketService.removeListener('user_typing');
      socketService.removeListener('user_joined_chat');
      socketService.removeListener('user_left_chat');
      socketService.removeListener('chat_presence_ack');
      socketService.removeListener('message_pinned');
      socketService.removeListener('message_deleted');
      
      socketService.leaveChat(user._id);
      socketService.disconnect();
    };
  }, [user._id, pinnedMessage]);

  // Message Action Handlers
  const handleLongPress = useCallback((message) => {
    console.log('👆 Long press on message:', message._id);
    setSelectedMessage(message);
    setShowActionSheet(true);
  }, []);

  const handleReply = () => {
    console.log('↩️ Reply action triggered for:', selectedMessage?._id);
    if (!selectedMessage) return;
    setReplyToMessage(selectedMessage);
    setShowActionSheet(false);
  };

  const handlePin = () => {
    console.log('📌 Pin action triggered for:', selectedMessage?._id);
    if (!selectedMessage) return;
    
    // Toggle pin status
    const newPinStatus = !selectedMessage.isPinned;
    console.log('📌 Setting pin status to:', newPinStatus);
    socketService.pinMessage(selectedMessage._id, selectedMessage.conversationId, newPinStatus);
    setShowActionSheet(false);
  };

  const handleStar = () => {
    console.log('⭐ Star action triggered for:', selectedMessage?._id);
    if (!selectedMessage) return;
    
    // Toggle star status
    const isCurrentlyStarred = selectedMessage.starredBy?.includes(userData._id);
    const newStarStatus = !isCurrentlyStarred;
    console.log('⭐ Setting star status to:', newStarStatus);
    socketService.starMessage(selectedMessage._id, newStarStatus);
    setShowActionSheet(false);
  };

  const handleDelete = (deleteForEveryone = false) => {
    console.log('🗑️ Delete action triggered for:', selectedMessage?._id, 'Everyone:', deleteForEveryone);
    if (!selectedMessage) return;

    socketService.deleteMessage(selectedMessage._id, deleteForEveryone);
    setShowActionSheet(false);
  };

  const confirmDelete = () => {
    if (!selectedMessage) return;

    const isMyMessage = selectedMessage.senderId._id === userData._id;
    const isRecent = (Date.now() - new Date(selectedMessage.createdAt).getTime()) < 60 * 60 * 1000; // 1 hour

    const options = [
      {
        text: 'Delete for me',
        onPress: () => handleDelete(false),
        style: 'destructive'
      },
      {
        text: 'Cancel',
        style: 'cancel'
      }
    ];

    if (isMyMessage && isRecent) {
      options.unshift({
        text: 'Delete for everyone',
        onPress: () => handleDelete(true),
        style: 'destructive'
      });
    }

    Alert.alert(
      'Delete Message?',
      'Are you sure you want to delete this message?',
      options
    );
  };

  const loadMessages = async () => {
    try {
      const data = await getMessages(user._id, null, 50);
      // For inverted list: newest first (index 0)
      setMessages(data.reverse());
      setHasMore(data.length >= 50);
      
      // Mark all as read if we have messages
      if (data.length > 0) {
        socketService.markAsRead(data[0].conversationId);
      }
    } catch (error) {
      console.error('Load messages error:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadMoreMessages = async () => {
    if (isLoadingMore || !hasMore || messages.length === 0) return;

    setIsLoadingMore(true);
    try {
      // Get oldest message (last in inverted array)
      const oldestMessage = messages[messages.length - 1];
      const data = await getMessages(user._id, oldestMessage.createdAt, 50);
      
      if (data.length > 0) {
        // Append to end of array (top of screen visually)
        // Append to end of array (top of screen visually)
        setMessages(prev => {
          // Filter out any messages that already exist in prev
          const newMessages = data.reverse().filter(newMsg => 
            !prev.some(existingMsg => existingMsg._id === newMsg._id)
          );
          return [...prev, ...newMessages];
        });
        setHasMore(data.length >= 50);
      } else {
        setHasMore(false);
      }
    } catch (error) {
      console.error('Load more messages error:', error);
    } finally {
      setIsLoadingMore(false);
    }
  };

  const scrollToBottom = () => {
    if (flatListRef.current && messages.length > 0) {
      flatListRef.current.scrollToOffset({ offset: 0, animated: true });
    }
  };

  const handleTyping = (text) => {
    setInputText(text);
    
    if (!isTyping) {
      socketService.sendTyping(user._id, true);
    }
    
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    
    typingTimeoutRef.current = setTimeout(() => {
      socketService.sendTyping(user._id, false);
    }, 2000);
  };

  const handleSend = async () => {
    if (!inputText.trim()) return;

    const tempId = Date.now().toString();
    const message = {
      _id: tempId,
      tempId,
      content: inputText.trim(),
      senderId: { _id: userData._id },
      receiverId: user._id,
      createdAt: new Date().toISOString(),
      status: 'sent',
      replyTo: replyToMessage,
    };

    // For inverted list, add to START (bottom of screen)
    setMessages((prev) => [message, ...prev]);
    setInputText('');
    setReplyToMessage(null);

    try {
      await socketService.sendMessage(
        user._id, 
        message.content, 
        tempId, 
        'text', 
        null, 
        null, 
        replyToMessage?._id // Pass replyTo ID
      );
    } catch (error) {
      console.error('Send message error:', error);
    }
  };

  const showHoldToRecordHint = () => {
    setShowHoldHint(true);
    
    // Fade in
    Animated.sequence([
      Animated.timing(hintOpacity, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.delay(1500),
      Animated.timing(hintOpacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setShowHoldHint(false);
    });
  };

  const startRecording = async () => {
    // Prevent concurrent operations
    if (isRecordingOperationInProgress.current) {
      console.log('⚠️ Recording operation already in progress, ignoring');
      return;
    }

    try {
      isRecordingOperationInProgress.current = true;
      console.log('🎤 Start recording requested');
      
      // Clear any existing interval first
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
        recordingIntervalRef.current = null;
      }

      // Clean up any existing recording using both state and ref
      const existingRecording = recordingRef.current || recording;
      if (existingRecording) {
        console.log('🎤 Cleaning up existing recording...');
        try {
          const status = await existingRecording.getStatusAsync();
          if (status.isRecording) {
            await existingRecording.stopAndUnloadAsync();
          } else {
            await existingRecording.unloadAsync();
          }
        } catch (e) {
          console.log('⚠️ Error cleaning up previous recording:', e);
          try {
            await existingRecording.unloadAsync();
          } catch (e2) {
            console.log('⚠️ Force unload also failed:', e2);
          }
        }
        setRecording(null);
        recordingRef.current = null;
        await new Promise(resolve => setTimeout(resolve, 200));
      }

      console.log('🎤 Requesting permissions...');
      const permission = await Audio.requestPermissionsAsync();
      
      if (permission.status !== 'granted') {
        alert('Please grant audio recording permissions');
        isRecordingOperationInProgress.current = false;
        return;
      }

      // Reset audio mode completely first
      console.log('🎤 Resetting audio mode...');
      try {
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: false,
          playsInSilentModeIOS: false,
        });
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (e) {
        console.log('⚠️ Error resetting audio mode:', e);
      }

      // Now set recording mode
      console.log('🎤 Setting recording audio mode...');
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
        staysActiveInBackground: false,
      });

      // Give audio system time to settle
      await new Promise(resolve => setTimeout(resolve, 200));

      console.log('🎤 Creating new recording...');
      const { recording: newRecording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      
      console.log('🎤 Recording started successfully');
      setRecording(newRecording);
      recordingRef.current = newRecording;
      setIsRecording(true);
      setRecordingDuration(0);
      setSlideX(0);

      const startTime = Date.now();
      recordingIntervalRef.current = setInterval(() => {
        const elapsed = Math.floor((Date.now() - startTime) / 1000);
        setRecordingDuration(elapsed);
      }, 100);

      console.log('🎤 Recording started successfully');
      isRecordingOperationInProgress.current = false;
      socketService.sendRecording(user._id, true);
    } catch (err) {
      console.error('❌ Failed to start recording:', err);
      alert('Failed to start recording: ' + err.message);
      setIsRecording(false);
      setRecording(null);
      recordingRef.current = null;
      isRecordingOperationInProgress.current = false;
    }
  };

  const stopRecording = async () => {
    if (!recording || !isRecording) {
      console.log('⚠️ No active recording to stop');
      return;
    }

    if (isRecordingOperationInProgress.current) {
      console.log('⚠️ Operation in progress, ignoring stop request');
      return;
    }

    isRecordingOperationInProgress.current = true;
    console.log('🛑 Stopping recording...');
    setIsRecording(false);
    socketService.sendRecording(user._id, false);
    
    if (recordingIntervalRef.current) {
      clearInterval(recordingIntervalRef.current);
      recordingIntervalRef.current = null;
    }

    // Capture duration before resetting
    const finalDuration = recordingDuration;
    console.log('🛑 Final recording duration:', finalDuration, 'seconds');

    // Check minimum duration (at least 1 second)
    if (finalDuration < 1) {
      console.log('⚠️ Recording too short, cancelling');
      try {
        await recording.stopAndUnloadAsync();
      } catch (e) {
        console.log('Error stopping short recording:', e);
      }
      setRecording(null);
      setRecordingDuration(0);
      recordingRef.current = null;
      setSlideX(0);
      isRecordingOperationInProgress.current = false;
      alert('Recording too short. Please hold for at least 1 second.');
      return;
    }

    try {
      await recording.stopAndUnloadAsync();
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
      });
      
      const uri = recording.getURI();
      console.log('✅ Recording stopped and stored at:', uri);
      console.log('✅ Recording duration:', finalDuration, 'seconds');
      
      // Upload and send with captured duration
      await uploadAndSendAudio(uri, finalDuration);
      
      setRecording(null);
      setRecordingDuration(0);
      recordingRef.current = null;
      setSlideX(0);
      isRecordingOperationInProgress.current = false;
    } catch (error) {
      console.error('❌ Error stopping recording:', error);
      alert('Failed to send audio message: ' + error.message);
      setRecording(null);
      setRecordingDuration(0);
      recordingRef.current = null;
      setSlideX(0);
      isRecordingOperationInProgress.current = false;
    }
  };

  const cancelRecording = async () => {
    if (!recording || !isRecording) {
      console.log('⚠️ No active recording to cancel');
      return;
    }

    if (isRecordingOperationInProgress.current) {
      console.log('⚠️ Operation in progress, ignoring cancel request');
      return;
    }

    isRecordingOperationInProgress.current = true;
    console.log('🚫 Cancelling recording...');
    setIsRecording(false);
    socketService.sendRecording(user._id, false);
    
    if (recordingIntervalRef.current) {
      clearInterval(recordingIntervalRef.current);
      recordingIntervalRef.current = null;
    }

    try {
      await recording.stopAndUnloadAsync();
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
      });
      
      setRecording(null);
      setRecordingDuration(0);
      recordingRef.current = null;
      setSlideX(0);
      isRecordingOperationInProgress.current = false;
      console.log('🚫 Recording cancelled');
    } catch (error) {
      console.error('❌ Error cancelling recording:', error);
      setRecording(null);
      setRecordingDuration(0);
      recordingRef.current = null;
      setSlideX(0);
      isRecordingOperationInProgress.current = false;
    }
  };

  // Mic button gesture handlers
  const micPressStart = useRef({ x: 0, y: 0, time: 0 });
  const hasStartedRecording = useRef(false);

  const handleMicPressIn = (evt) => {
    micPressStart.current = {
      x: evt.nativeEvent.pageX,
      y: evt.nativeEvent.pageY,
      time: Date.now()
    };
    hasStartedRecording.current = false;
    console.log('🎤 Mic button pressed');
    
    // Start recording after short delay (prevents accidental taps)
    setTimeout(() => {
      if (micPressStart.current.time > 0) {
        startRecording();
        hasStartedRecording.current = true;
      }
    }, 200);
  };

  const handleMicMove = (evt) => {
    if (!isRecording || !hasStartedRecording.current) return;
    
    const currentX = evt.nativeEvent.pageX;
    const currentY = evt.nativeEvent.pageY;
    const deltaX = currentX - micPressStart.current.x;
    const deltaY = currentY - micPressStart.current.y;
    
    // Only track left slide (cancel gesture)
    if (deltaX < 0) {
      const newSlideX = Math.max(-150, deltaX);
      setSlideX(newSlideX);
      console.log('👆 Sliding left:', newSlideX);
    }
  };

  const handleMicPressOut = () => {
    const pressDuration = Date.now() - micPressStart.current.time;
    console.log('🎤 Mic button released, duration:', pressDuration, 'ms');
    
    micPressStart.current = { x: 0, y: 0, time: 0 };
    
    // If too short or not started recording, cancel
    if (!hasStartedRecording.current || pressDuration < 200) {
      console.log('⚠️ Press too short, not recording');
      if (isRecording) {
        cancelRecording();
      }
      // Show toast notification
      showHoldToRecordHint();
      hasStartedRecording.current = false;
      return;
    }
    
    // Check if slid left enough to cancel
    if (slideX < -100) {
      console.log('🚫 Cancelled by slide');
      cancelRecording();
    } else if (isRecording) {
      console.log('📤 Sending recording');
      stopRecording();
    }
    
    hasStartedRecording.current = false;
  };

  // Touch handlers for recording bar slide-to-cancel
  const initialTouchX = useRef(0);
  const hasMoved = useRef(false);

  const handleTouchStart = (evt) => {
    if (isRecording) {
      initialTouchX.current = evt.nativeEvent.pageX;
      hasMoved.current = false;
      console.log('👆 Touch started on bar at:', initialTouchX.current);
    }
  };

  const handleTouchMove = (evt) => {
    if (isRecording && !isRecordingOperationInProgress.current) {
      const currentX = evt.nativeEvent.pageX;
      const deltaX = currentX - initialTouchX.current;
      
      if (Math.abs(deltaX) > 10) {
        hasMoved.current = true;
        const newSlideX = Math.min(0, Math.max(-150, deltaX));
        setSlideX(newSlideX);
        console.log('👆 Bar moved, deltaX:', deltaX);
      }
    }
  };

  const handleTouchEnd = () => {
    if (isRecording && hasMoved.current && !isRecordingOperationInProgress.current) {
      const slideDistance = slideX;
      console.log('👆 Bar touch ended, slide distance:', slideDistance);
      
      // Cancel if slid far enough
      if (slideDistance < -100) {
        console.log('🚫 Cancelling by bar slide');
        cancelRecording();
      }
      
      setSlideX(0);
      hasMoved.current = false;
    }
  };

  const uploadAndSendAudio = async (uri, duration) => {
    try {
      console.log('📤 Starting audio upload...');
      console.log('📤 URI:', uri);
      console.log('📤 Duration:', duration, 'seconds');

      // Create optimistic message immediately
      const tempId = Date.now().toString();
      const optimisticMessage = {
        _id: tempId,
        tempId,
        messageType: 'audio',
        audioUrl: uri, // Use local URI initially
        audioDuration: duration,
        senderId: { _id: userData._id },
        receiverId: user._id,
        createdAt: new Date().toISOString(),
        status: 'uploading', // Show uploading status
        isOptimistic: true, // Flag for optimistic update
      };

      console.log('📨 Adding optimistic audio message to UI');
      setMessages((prev) => [optimisticMessage, ...prev]);
      scrollToBottom();

      // Upload in background
      const formData = new FormData();
      const filename = uri.split('/').pop();
      const match = /\.(\w+)$/.exec(filename);
      const type = match ? `audio/${match[1]}` : 'audio/m4a';
      
      const fileObject = {
        uri,
        type,
        name: filename,
      };

      console.log('📤 File object:', fileObject);
      formData.append('file', fileObject);

      console.log('📤 Uploading to /upload/audio...');

      const response = await api.post('/upload/audio', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        transformRequest: (data) => data,
      });

      console.log('✅ Audio uploaded successfully!');
      console.log('✅ Response:', response.data);
      const audioUrl = response.data.url;

      if (!audioUrl) {
        throw new Error('No audio URL returned from server');
      }

      // Update message with real URL
      setMessages((prev) => 
        prev.map((m) => 
          m.tempId === tempId 
            ? { ...m, audioUrl, status: 'sent', isOptimistic: false }
            : m
        )
      );

      // Send via socket with actual URL
      await socketService.sendMessage(user._id, '', tempId, 'audio', audioUrl, duration);
      console.log('✅ Audio message sent via socket');
    } catch (error) {
      console.error('❌ Upload audio error:', error);
      console.error('❌ Error details:', error.response?.data);
      
      // Mark message as failed
      setMessages((prev) => 
        prev.map((m) => 
          m.isOptimistic && m.status === 'uploading'
            ? { ...m, status: 'failed' }
            : m
        )
      );
      
      alert('Failed to send audio message: ' + error.message);
      throw error;
    }
  };

  const renderStatus = (status) => {

    switch (status) {
      case 'sent':
        return <Ionicons name="checkmark" size={16} color="rgba(255,255,255,0.6)" />;
      case 'delivered':
        return <Ionicons name="checkmark-done" size={16} color="rgba(255,255,255,0.6)" />;
      case 'read':
        return <Ionicons name="checkmark-done" size={16} color="#4CAF50" />; // Blue/Green ticks
      default:
        return <Ionicons name="time-outline" size={16} color="rgba(255,255,255,0.6)" />;
    }
  };

  const renderMessage = useCallback(({ item }) => (
    <MessageItem 
      item={item} 
      userData={userData} 
      user={user} 
      handleLongPress={handleLongPress}
      setReplyToMessage={setReplyToMessage}
      onSwipeableOpen={handleSwipeableOpen}
    />
  ), [userData, user, handleLongPress, handleSwipeableOpen]);

  // Message Action Sheet Component
  const MessageActionSheet = () => {
    if (!showActionSheet || !selectedMessage) return null;

    const isMine = selectedMessage.senderId._id === userData._id;

    return (
      <View style={styles.actionSheetOverlay}>
        <TouchableWithoutFeedback onPress={() => setShowActionSheet(false)}>
          <View style={styles.actionSheetBackdrop} />
        </TouchableWithoutFeedback>
        
        <View style={styles.whatsappActionContainer}>
          {/* Emoji Reactions Bar */}
          <View style={styles.emojiBar}>
            <TouchableOpacity style={styles.emojiButton}>
              <Text style={styles.emojiText}>👍</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.emojiButton}>
              <Text style={styles.emojiText}>❤️</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.emojiButton}>
              <Text style={styles.emojiText}>😂</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.emojiButton}>
              <Text style={styles.emojiText}>😮</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.emojiButton}>
              <Text style={styles.emojiText}>😢</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.emojiButton}>
              <Text style={styles.emojiText}>🙏</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.emojiButton}>
              <Text style={styles.emojiText}>👏</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.emojiPlusButton}>
              <Ionicons name="add" size={20} color="#FFF" />
            </TouchableOpacity>
          </View>

          {/* Selected Message Preview */}
          <View style={[
            styles.messagePreview,
            isMine ? styles.messagePreviewMine : styles.messagePreviewTheirs
          ]}>
            {selectedMessage.messageType === 'audio' ? (
              <View style={styles.previewAudioContent}>
                <Ionicons name="mic" size={16} color={isMine ? "#FFF" : "#000"} />
                <Text style={[styles.previewText, isMine && { color: '#FFF' }]}>
                  Voice message
                </Text>
              </View>
            ) : (
              <Text 
                style={[styles.previewText, isMine && { color: '#FFF' }]} 
                numberOfLines={3}
              >
                {selectedMessage.content}
              </Text>
            )}
            <Text style={[styles.previewTime, isMine && { color: 'rgba(255,255,255,0.7)' }]}>
              {formatTime(selectedMessage.createdAt)}
            </Text>
          </View>

          {/* Action Menu */}
          <View style={styles.whatsappActionMenu}>
            {/* Reply - Available for all messages */}
            <TouchableOpacity 
              style={styles.whatsappActionItem} 
              onPress={handleReply}
              activeOpacity={0.7}
            >
              <Ionicons name="arrow-undo-outline" size={20} color="#FFF" />
              <Text style={styles.whatsappActionText}>Reply</Text>
            </TouchableOpacity>

            {/* Star - Available for all messages */}
            <TouchableOpacity 
              style={styles.whatsappActionItem} 
              onPress={handleStar}
              activeOpacity={0.7}
            >
              <Ionicons 
                name={selectedMessage.starredBy?.includes(userData._id) ? "star" : "star-outline"} 
                size={20} 
                color="#FFF" 
              />
              <Text style={styles.whatsappActionText}>
                {selectedMessage.starredBy?.includes(userData._id) ? "Unstar" : "Star"}
              </Text>
            </TouchableOpacity>

            {/* Pin - Only for own messages */}
            {isMine && (
              <TouchableOpacity 
                style={styles.whatsappActionItem} 
                onPress={handlePin}
                activeOpacity={0.7}
              >
                <Ionicons 
                  name={selectedMessage.isPinned ? "pin" : "pin-outline"} 
                  size={20} 
                  color="#FFF" 
                />
                <Text style={styles.whatsappActionText}>
                  {selectedMessage.isPinned ? "Unpin" : "Pin"}
                </Text>
              </TouchableOpacity>
            )}

            {/* Delete - Only for own messages */}
            {isMine && (
              <TouchableOpacity 
                style={styles.whatsappActionItem} 
                onPress={confirmDelete}
                activeOpacity={0.7}
              >
                <Ionicons name="trash-outline" size={20} color="#FF4444" />
                <Text style={[styles.whatsappActionText, { color: '#FF4444' }]}>Delete</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    );
  };

  // Pinned Message Banner
  const PinnedMessageBanner = () => {
    if (!pinnedMessage) return null;

    return (
      <TouchableOpacity 
        style={styles.pinnedBanner}
        onPress={() => {
          // Scroll to pinned message logic would go here
          // For now just show it
        }}
      >
        <View style={styles.pinnedContent}>
          <Ionicons name="pin" size={14} color="#007AFF" style={styles.pinnedIcon} />
          <View>
            <Text style={styles.pinnedTitle}>Pinned Message</Text>
            <Text style={styles.pinnedText} numberOfLines={1}>
              {pinnedMessage.messageType === 'audio' ? '🎤 Audio Message' : pinnedMessage.content}
            </Text>
          </View>
        </View>
        {userData._id === pinnedMessage.pinnedBy && (
          <TouchableOpacity 
            onPress={() => socketService.pinMessage(pinnedMessage._id, pinnedMessage.conversationId, false)}
            style={styles.unpinButton}
          >
            <Ionicons name="close" size={16} color="#999" />
          </TouchableOpacity>
        )}
      </TouchableOpacity>
    );
  };

  // Reply Preview Component
  const ReplyPreview = () => {
    if (!replyToMessage) return null;

    return (
      <View style={styles.replyPreview}>
        <View style={styles.replyBar} />
        <View style={styles.replyContent}>
          <Text style={styles.replyName}>
            {replyToMessage.senderId._id === userData._id ? 'You' : user.name}
          </Text>
          <Text style={styles.replyText} numberOfLines={1}>
            {replyToMessage.messageType === 'audio' ? '🎤 Audio Message' : replyToMessage.content}
          </Text>
        </View>
        <TouchableOpacity onPress={() => setReplyToMessage(null)}>
          <Ionicons name="close-circle" size={20} color="#999" />
        </TouchableOpacity>
      </View>
    );
  };



  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#000" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={28} color="#000" />
        </TouchableOpacity>
        <Image source={{ uri: user.image }} style={styles.avatar} />
        <View style={styles.headerInfo}>
          <Text style={styles.headerName}>{user.name}</Text>
          <Text style={styles.statusText}>
            {isRemoteRecording ? 'Recording audio...' : isTyping ? 'Typing...' : isOtherUserInChat ? 'In Chat' : 'Online'}
          </Text>
        </View>
        
        {/* Call Buttons */}
        <View style={styles.callButtons}>
          <TouchableOpacity 
            onPress={() => startCall(user, 'audio')}
            style={[styles.callButton, callState.visible && { opacity: 0.5 }]}
            disabled={callState.visible}
          >
            <Ionicons name="call" size={22} color="#007AFF" />
          </TouchableOpacity>
          <TouchableOpacity 
            onPress={() => startCall(user, 'video')}
            style={[styles.callButton, callState.visible && { opacity: 0.5 }]}
            disabled={callState.visible}
          >
            <Ionicons name="videocam" size={24} color="#007AFF" />
          </TouchableOpacity>
        </View>
      </View>

      <PinnedMessageBanner />

      <FlatList
        ref={flatListRef}
        data={messages}
        renderItem={renderMessage}
        keyExtractor={(item, index) => item._id || item.tempId || index.toString()}
        contentContainerStyle={styles.messageList}
        inverted={true}
        onEndReached={loadMoreMessages}
        onEndReachedThreshold={0.5}
        ListFooterComponent={isLoadingMore ? <ActivityIndicator size="small" color="#007AFF" /> : null}
        showsVerticalScrollIndicator={false}
      />

      {matchStatus === 'pending' ? (
        <View style={styles.pendingInputContainer}>
          <Ionicons name="lock-closed-outline" size={24} color="#999" />
          <Text style={styles.pendingInputText}>
            {isInitiator 
              ? `Waiting for ${user.name} to like you back`
              : 'Swipe right on their profile to start chatting'}
          </Text>
        </View>
      ) : (
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
         
          style={styles.inputWrapper}
        >
          <ReplyPreview />

          {/* Hold to Record Hint Toast */}
          {showHoldHint && (
            <Animated.View style={[styles.hintToast, { opacity: hintOpacity }]}>
              <Text style={styles.hintText}>Hold to record voice message</Text>
            </Animated.View>
          )}

          <View style={styles.inputContainer}>
            {/* Recording Mode - Full Width */}
            {isRecording ? (
              <>
                <Animated.View 
                  style={[
                    styles.recordingFullContainer,
                    { transform: [{ translateX: slideX }] }
                  ]}
                  onTouchStart={handleTouchStart}
                  onTouchMove={handleTouchMove}
                  onTouchEnd={handleTouchEnd}
                >
                  <View style={styles.recordingLeftSide}>
                    <Text style={[
                      styles.slideToCancel,
                      slideX < -60 && { color: '#FF4444', fontWeight: '700' }
                    ]}>
                      {slideX < -60 ? '🗑️ Release to cancel' : '← Slide to cancel'}
                    </Text>
                    <View style={styles.recordingInfo}>
                      <View style={styles.recordingDot} />
                      <Text style={styles.recordingTime}>
                        {Math.floor(recordingDuration / 60)}:{(recordingDuration % 60).toString().padStart(2, '0')}
                      </Text>
                    </View>
                  </View>
                </Animated.View>
                
                {/* Delete Button */}
                <TouchableOpacity 
                  style={styles.deleteButton}
                  onPress={cancelRecording}
                >
                  <Ionicons name="trash-outline" size={24} color="#FF4444" />
                </TouchableOpacity>

                {/* Send Button */}
                <TouchableOpacity 
                  style={styles.sendButton}
                  onPress={stopRecording}
                >
                  <Ionicons name="send" size={20} color="#FFF" />
                </TouchableOpacity>
              </>
            ) : (
              <>
                {/* Text Input */}
                <View style={styles.textInputContainer}>
                  <TextInput
                    style={styles.input}
                    placeholder="Message"
                    placeholderTextColor="#999"
                    value={inputText}
                    onChangeText={handleTyping}
                    multiline
                  />
                </View>

                {/* Send or Mic Button */}
                {inputText.trim().length > 0 ? (
                  <TouchableOpacity style={styles.sendButton} onPress={handleSend}>
                    <Ionicons name="send" size={20} color="#FFF" />
                  </TouchableOpacity>
                ) : (
                  <View
                    onTouchStart={handleMicPressIn}
                    onTouchMove={handleMicMove}
                    onTouchEnd={handleMicPressOut}
                    style={styles.micButton}
                  >
                  <Ionicons name="mic" size={24} color="#FFF" />
                </View>
                )}
              </>
            )}
          </View>
        </KeyboardAvoidingView>
      )}
      {/* Call Modal */}
      {/* Message Action Sheet */}
      <MessageActionSheet />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F2F2F7',
  },
  backButton: {
    marginRight: 16,
    padding: 4,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  headerInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  headerName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#000',
  },
  statusText: {
    fontSize: 12,
    color: '#4CAF50',
  },
  messageList: {
    paddingVertical: 16,
    paddingBottom: 20,
  },
  swipeableContainer: {
    marginBottom: 8,
  },
  replyActionContainer: {
    width: 80,
    justifyContent: 'center',
    alignItems: 'center',
  },
  replyActionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F2F2F7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  messageBubble: {
    maxWidth: '80%',
    minWidth: 100,
    padding: 12,
    borderRadius: 20,
    marginBottom: 10,
  },
  myMessage: {
    alignSelf: 'flex-end',
    backgroundColor: '#000000',
  },
  theirMessage: {
    alignSelf: 'flex-start',
    backgroundColor: '#F2F2F7',
    borderBottomLeftRadius: 4,
  },
  messageText: {
    fontSize: 16,
    lineHeight: 22,
    flexShrink: 1,
  },
  myMessageText: {
    color: '#FFFFFF',
  },
  theirMessageText: {
    color: '#000000',
  },
  timeText: {
    fontSize: 10,
    marginTop: 4,
    alignSelf: 'flex-end',
  },
  myTimeText: {
    color: 'rgba(255,255,255,0.6)',
  },
  theirTimeText: {
    color: '#999999',
  },
  inputWrapper: {
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#F2F2F7',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#FFF',
    gap: 8,
  },
  cameraButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F2F2F7',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
    backgroundColor: '#000',
  },
  textInputContainer: {
    flex: 1,
    backgroundColor: '#F0F0F0',
    borderRadius: 25,
    paddingHorizontal: 16,
    paddingVertical: 8,
    minHeight: 40,
    justifyContent: 'center',
  },
  input: {
    fontSize: 16,
    color: '#000',
    maxHeight: 100,
  },
  micButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#000',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  actionButton: {
    padding: 4,
  },
  sendButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#000',
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FFE5E5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  recordingFullContainer: {
    flex: 1,
    backgroundColor: '#F0F0F0',
    borderRadius: 25,
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  recordingLeftSide: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  slideToCancel: {
    fontSize: 14,
    color: '#999',
    fontWeight: '500',
  },
  recordingInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  recordingDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#FF4444',
  },
  recordingTime: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
  sendButtonText: {
    color: '#FFF',
    fontWeight: '600',
    fontSize: 14,
  },
  messageFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-end',
    marginTop: 4,
  },
  timestampInBubble: {
    fontSize: 9,
    color: '#888888',
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  pendingInputContainer: {
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F9F9F9',
    borderTopWidth: 1,
    borderTopColor: '#EEE',
  },
  pendingInputText: {
    marginTop: 8,
    color: '#666',
    textAlign: 'center',
    fontSize: 14,
  },
  audioMessageContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8,
    paddingHorizontal: 12,
    minWidth: 200,
  },
  audioMessageMine: {
    backgroundColor: '#000',
  },
  audioMessageTheirs: {
    backgroundColor: '#F0F0F0',
  },
  audioPlayButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  audioPlayButtonMine: {
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  audioPlayButtonTheirs: {
    backgroundColor: 'rgba(0,0,0,0.1)',
  },
  audioContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  audioWaveformContainer: {
    flex: 1,
    height: 30,
    position: 'relative',
    justifyContent: 'center',
  },
  audioProgressBackground: {
    position: 'absolute',
    width: '100%',
    height: 2,
    backgroundColor: 'rgba(0,0,0,0.1)',
    borderRadius: 1,
  },
  audioProgressFill: {
    position: 'absolute',
    height: 2,
    borderRadius: 1,
  },
  audioWaveform: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    height: 30,
  },
  audioBar: {
    width: 2,
    borderRadius: 1,
    minHeight: 4,
  },
  audioTime: {
    fontSize: 12,
    fontWeight: '500',
    minWidth: 35,
  },
  audioTimeMine: {
    color: '#FFF',
  },
  audioTimeTheirs: {
    color: '#666',
  },
  audioControls: {
    flexDirection: 'column',
    alignItems: 'flex-end',
    gap: 4,
  },
  speedButton: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    backgroundColor: 'rgba(0,0,0,0.1)',
  },
  speedText: {
    fontSize: 10,
    fontWeight: '600',
  },
  speedTextMine: {
    color: '#FFF',
  },
  speedTextTheirs: {
    color: '#666',
  },
  hintToast: {
    position: 'absolute',
    bottom: 80,
    alignSelf: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 25,
    zIndex: 1000,
  },
  hintText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '500',
  },
  // Action Sheet Styles (WhatsApp Style)
  actionSheetOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1000,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  actionSheetBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.7)',
  },
  whatsappActionContainer: {
    width: '100%',
    maxWidth: 400,
    zIndex: 1001,
  },
  // Emoji Reactions Bar
  emojiBar: {
    flexDirection: 'row',
    backgroundColor: '#2A2A2A',
    borderRadius: 30,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginBottom: 12,
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  emojiButton: {
    padding: 6,
  },
  emojiText: {
    fontSize: 24,
  },
  emojiPlusButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#404040',
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Message Preview
  messagePreview: {
    backgroundColor: '#E5E5EA',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    minHeight: 60,
  },
  messagePreviewMine: {
    backgroundColor: '#000',
  },
  messagePreviewTheirs: {
    backgroundColor: '#E5E5EA',
  },
  previewAudioContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  previewText: {
    fontSize: 14,
    color: '#000',
    lineHeight: 20,
  },
  previewTime: {
    fontSize: 11,
    color: '#666',
    marginTop: 4,
  },
  // Action Menu
  whatsappActionMenu: {
    backgroundColor: '#2A2A2A',
    borderRadius: 12,
    overflow: 'hidden',
  },
  whatsappActionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    gap: 16,
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  whatsappActionText: {
    fontSize: 15,
    color: '#FFF',
    fontWeight: '400',
  },
  // Pinned Message Styles
  pinnedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F8F8',
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#EEE',
    justifyContent: 'space-between',
  },
  pinnedContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 10,
  },
  pinnedIcon: {
    transform: [{ rotate: '45deg' }],
  },
  pinnedTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#007AFF',
  },
  pinnedText: {
    fontSize: 12,
    color: '#666',
  },
  unpinButton: {
    padding: 5,
  },
  pinnedIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 6,
    paddingHorizontal: 6,
    paddingVertical: 3,
    backgroundColor: 'rgba(255, 215, 0, 0.1)', // Light gold background
    borderRadius: 4,
  },
  pinnedIndicatorMine: {
    alignSelf: 'flex-end', // Align to right for my messages
  },
  pinnedIndicatorTheirs: {
    alignSelf: 'flex-start', // Align to left for their messages
  },
  pinnedLabel: {
    fontSize: 11,
    color: '#B8860B', // Dark gold color
    fontWeight: '600',
  },
  pinnedBubble: {
    borderWidth: 2,
    borderColor: '#FFD700', // Gold border for pinned messages
  },
  starIndicator: {
    position: 'absolute',
    top: 4,
    left: 4,
    zIndex: 1,
  },
  // Reply Styles
  replyPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F8F8',
    padding: 10,
    borderTopWidth: 1,
    borderTopColor: '#EEE',
    gap: 10,
  },
  replyBar: {
    width: 4,
    height: '100%',
    backgroundColor: '#007AFF',
    borderRadius: 2,
  },
  replyContent: {
    flex: 1,
  },
  replyName: {
    fontSize: 12,
    fontWeight: '600',
    color: '#007AFF',
    marginBottom: 2,
  },
  replyText: {
    fontSize: 12,
    color: '#666',
  },
  // Reply Context in Message Bubble (WhatsApp Style)
  replyContext: {
    flexDirection: 'row',
    borderRadius: 6,
    padding: 6,
    paddingLeft: 8,
    marginBottom: 6,
    gap: 8,
  },
  replyContextMine: {
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  replyContextTheirs: {
    backgroundColor: 'rgba(0,0,0,0.03)',
  },
  replyBorder: {
    width: 2,
    borderRadius: 1,
  },
  replyContentWrapper: {
    flex: 1,
  },
  replySenderName: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 2,
  },
  replyMessageText: {
    fontSize: 12,
    lineHeight: 16,
    flexShrink: 1,
  },
  replyAudioPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  // Call Button Styles
  callButtons: {
    flexDirection: 'row',
    gap: 16,
    alignItems: 'center',
  },
  callButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F0F0F0',
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default ChatScreen;
