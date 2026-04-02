import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Animated,
  Alert,
  Linking,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import socketService from '../../services/socket';
import { useAuth } from '../../context/AuthContext';
import { useCall } from '../../context/CallContext';
import api from '../../services/api/config';
import { reportUser, blockUser, respondToMatch } from '../../services/api/match';
import CustomAlert from '../../components/CustomAlert';
import DeclineConfirmationSheet from '../../components/DeclineConfirmationSheet';
import { useCustomAlert } from '../../hooks/useCustomAlert';
import { useBadge } from '../../context/BadgeContext';
import { useNetworkStatus } from '../../hooks/useNetworkStatus';
import * as chatAnalytics from '../../services/chatAnalytics';
import StickerPicker from './components/StickerPicker';
import StickerMessage from './components/StickerMessage';
import AudioMessage from './components/messages/AudioMessage';
import ImageMessage from './components/messages/ImageMessage';
import FileMessage from './components/messages/FileMessage';
import CallMessage from './components/messages/CallMessage';
import SwipeableMessage from './components/actions/SwipeableMessage';
import ChatHeader from './components/ChatHeader';
import ReplyBubble from './components/actions/ReplyBubble';
import ImagePreviewModal from './components/input/ImagePreviewModal';
import AttachmentOptionsModal from './components/input/AttachmentOptionsModal';
import ChatInput from './components/input/ChatInput';
import ImageViewModal from './components/ImageViewModal';
import MessageActionSheet from './components/MessageActionSheet';
import ForwardConversationModal from './components/ForwardConversationModal';
import ProfanityWarningModal from './components/ProfanityWarningModal';
import PinnedMessageBanner from './components/PinnedMessageBanner';
import useAudioRecorder from './hooks/useAudioRecorder';
import useMessages from './hooks/useMessages';
import useMessageActions from './hooks/useMessageActions';
import useStickers from './hooks/useStickers';
import { useFileUpload } from './hooks/useFileUpload';
import { useImagePicker } from './hooks/useImagePicker';
import styles from './styles';
import { normalizeContent } from '../../utils/messageContent';
import { sanitizeText } from '../../utils/inputSanitization';

// Import bad-words with error handling for React Native compatibility
let Filter;
try {
  const badWordsModule = require('bad-words');
  // bad-words v4 exports Filter as a named export
  Filter = badWordsModule.Filter || badWordsModule.default || badWordsModule;
  // Verify Filter is a constructor
  if (typeof Filter !== 'function') {
    throw new Error('Filter is not a constructor');
  }
} catch (e) {
  console.warn('bad-words package not available, using fallback filter:', e.message);
  // Fallback filter implementation
  Filter = class {
    constructor(options = {}) {
      this.badWords = options.list || [];
    }
    isProfane(text) {
      const lowerText = text.toLowerCase();
      return this.badWords.some(word => lowerText.includes(word.toLowerCase()));
    }
  };
}

// Helper function
const formatTime = (date) => {
  const d = new Date(date);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

// Memoized Message Item Component
const MessageItem = React.memo(({ item, userData, user, handleLongPress, setReplyToMessage, onSwipeableOpen, scrollToMessage, highlightedMessageId, onImagePress, viewedMessages }) => {
  const isMine = item.senderId._id === userData._id;
  const isOptimistic = item.isOptimistic;
  const isFailed = item.status === 'failed';
  const isDeleted = item.deletedForEveryone;
  const isHighlighted = highlightedMessageId === item._id;

  if (item.deletedFor?.includes(userData._id)) {
    return null;
  }

  // Safety: Ensure content is always normalized before rendering
  const safeContent = item.content !== undefined ? normalizeContent(item.content) : '';

  const messageContent = (
    <TouchableOpacity
      onLongPress={() => handleLongPress(item)}
      delayLongPress={200}
      activeOpacity={0.9}
      accessible={true}
      accessibilityLabel={`${isMine ? 'Your' : 'Their'} ${item.messageType || 'text'} message${item.content ? `: ${item.content.substring(0, 50)}` : ''}`}
      accessibilityHint="Double tap and hold to view message options"
      accessibilityRole="button"
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
          item.isPinned && styles.pinnedBubble,
          isHighlighted && styles.highlightedMessage
        ]}
      >


        <ReplyBubble
          replyTo={item.replyTo}
          isMine={isMine}
          userData={userData}
          user={user}
          onPress={() => scrollToMessage && scrollToMessage(item.replyTo._id)}
        />


        {isDeleted ? (
          <Text style={[styles.messageText, isMine ? styles.myMessageText : styles.theirMessageText, { fontStyle: 'italic', opacity: 0.6, fontSize: 12, paddingHorizontal: 0 }]}>
            <Ionicons name="ban" size={11} /> This message was deleted
          </Text>
        ) : item.messageType === 'audio' ? (
          <AudioMessage 
            audioUrl={item.audioUrl} 
            duration={item.audioDuration} 
            isMine={isMine}
            onLongPress={() => handleLongPress(item)}
          />
        ) : item.messageType === 'image' ? (
          <ImageMessage
            imageUrl={item.imageUrl}
            isViewOnce={item.isViewOnce}
            viewed={viewedMessages?.includes(item._id)}
            isMine={isMine}
            onPress={() => onImagePress && onImagePress(item)}
            onLongPress={() => handleLongPress(item)}
          />
        ) : item.messageType === 'sticker' ? (
          <StickerMessage 
            sticker={item.stickerEmoji || item.stickerId || (item.sticker?.emoji || item.sticker?.url)} 
            onLongPress={() => handleLongPress(item)}
          />
        ) : item.messageType === 'file' ? (
          <FileMessage
            fileName={item.fileName}
            fileSize={item.fileSize}
            fileUrl={item.fileUrl}
            isMine={isMine}
            onPress={() => {
              if (item.fileUrl) {
                Linking.openURL(item.fileUrl).catch(err => console.error('Error opening file:', err));
              }
            }}
            onLongPress={() => handleLongPress(item)}
          />
        ) : item.messageType === 'call' ? (
          <CallMessage
            message={item}
            isMine={isMine}
            onLongPress={() => handleLongPress(item)}
          />
          ) : (
            <View style={{ flexDirection: 'row', alignItems: 'flex-end', flexWrap: 'wrap' }}>
              <Text style={[styles.messageText, isMine ? styles.myMessageText : styles.theirMessageText]}>
                {safeContent || ' '}
              </Text>
              {item.isEdited && (
                <Text style={[styles.messageText, isMine ? styles.myMessageText : styles.theirMessageText, { fontSize: 10, opacity: 0.6, marginLeft: 4, fontStyle: 'italic' }]}>
                  (edited)
                </Text>
              )}
            </View>
          )}

        {/* Reactions */}
        {item.reactions && item.reactions.length > 0 && (
          <View style={[
            styles.reactionsContainer,
            isMine ? styles.reactionsContainerMine : styles.reactionsContainerTheirs
          ]}>
            {Object.entries(
              item.reactions.reduce((acc, reaction) => {
                if (!acc[reaction.emoji]) {
                  acc[reaction.emoji] = [];
                }
                acc[reaction.emoji].push(reaction);
                return acc;
              }, {})
            ).map(([emoji, reactions]) => {
              const reactionUserId = reactions[0]?.userId?._id || reactions[0]?.userId;
              const hasUserReaction = reactions.some(r => {
                const rUserId = r.userId?._id || r.userId;
                return String(rUserId) === String(userData._id);
              });
              
              return (
                <TouchableOpacity
                  key={emoji}
                  style={[
                    styles.reactionBubble,
                    hasUserReaction && styles.reactionBubbleActive
                  ]}
                  onPress={() => handleLongPress(item)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.reactionEmoji}>{emoji}</Text>
                  {reactions.length > 1 && (
                    <Text style={styles.reactionCount}>{reactions.length}</Text>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
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
                  name={(item.status === 'read' || item.status === 'delivered') ? "checkmark-done" : "checkmark"} 
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

  // Don't allow swipe actions for deleted messages or view once images
  const allowSwipeActions = !isDeleted && !(item.isViewOnce && item.messageType === 'image');
  
  return (
    <SwipeableMessage 
      onReply={allowSwipeActions ? () => setReplyToMessage(item) : undefined}
      isMine={isMine}
      onSwipeableOpen={allowSwipeActions ? onSwipeableOpen : undefined}
    >
      {messageContent}
    </SwipeableMessage>
  );
});

const ChatScreen = ({ route, navigation }) => {
  // Use state for match status to allow updating it locally upon acceptance
  const { user, matchStatus: initialMatchStatus, isInitiator, isSuperLike, superLikeMessage } = route.params;
  const [matchStatus, setMatchStatus] = useState(initialMatchStatus);
  const [isAccepting, setIsAccepting] = useState(false);
  const [declineSheetVisible, setDeclineSheetVisible] = useState(false);
  const { alertConfig, showAlert, hideAlert } = useCustomAlert();
  const { updateBadgeCounts } = useBadge();
  const { userData } = useAuth();
  const { startCall, callState } = useCall();
  const { isOffline } = useNetworkStatus();
  const isMine = userData._id === user._id;
  const insets = useSafeAreaInsets();

  // Debug: Log user object to verify structure
  useEffect(() => {
    if (__DEV__) {
      console.log('ChatScreen params:', JSON.stringify({
        matchStatus: initialMatchStatus,
        isInitiator,
        isSuperLike,
        hasSuperLikeMessage: !!superLikeMessage,
        superLikeMessage, // Log the actual message
        user: {
          _id: user._id,
          name: user.name,
          displayName: user.displayName
        }
      }, null, 2));
    }
  }, [user._id, isSuperLike, superLikeMessage]);

  // Messages & Socket Hook
  const {
    messages,
    setMessages,
    loading,
    isLoadingMore,
    hasMore,
    isTyping,
    isOtherUserInChat,
    isRemoteRecording,
    viewedMessages,
    setViewedMessages,
    pinnedMessage,
    setPinnedMessage,
    loadMessages,
    loadMoreMessages,
    error: messagesError,
    setError: setMessagesError,
    isShowingCached,
  } = useMessages(user, userData);
  
  // Audio Recording - using custom hook
  const {
    isRecording,
    recordingDuration,
    slideX,
    slideXRef,
    startRecording,
    stopRecording,
    cancelRecording,
    handleMicPressIn,
    handleMicMove,
    handleMicPressOut,
    handleRecordingContainerStart,
    handleRecordingContainerMove,
    handleRecordingContainerEnd,
  } = useAudioRecorder(user._id, (userId, isRecording) => {
    socketService.sendRecording(userId, isRecording);
  });
  
  // Message Actions Hook
  const {
    selectedMessage,
    setSelectedMessage,
    showActionSheet,
    setShowActionSheet,
    replyToMessage,
    setReplyToMessage,
    handleLongPress,
    handleReply,
    handlePin,
    handleStar,
    handleEdit,
    startEdit,
    cancelEdit,
    editingMessage,
    forwardingMessage,
    showForwardModal,
    setShowForwardModal,
    startForward,
    cancelForward,
    handleForward,
    handleReaction,
    handleDelete,
    confirmDelete,
    isActionLoading,
  } = useMessageActions(userData, setMessages);
  
  const [highlightedMessageId, setHighlightedMessageId] = useState(null);
  const [showHoldHint, setShowHoldHint] = useState(false);
  const [inputText, setInputText] = useState('');
  
  // Update input text when editing message
  useEffect(() => {
    if (editingMessage) {
      setInputText(editingMessage.content || '');
    } else if (!editingMessage) {
      // Clear input when canceling edit (only if we were editing)
      // Don't clear if user just sent a message normally
      if (inputText === (editingMessage?.content || '')) {
        setInputText('');
      }
    }
  }, [editingMessage]);
  
  const [isOnline, setIsOnline] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchMode, setIsSearchMode] = useState(false);
  
  // Rate limiting refs
  const lastSendTimeRef = useRef(0);
  const sendTimestampsRef = useRef([]);
  const MESSAGE_RATE_LIMIT = 10; // Max 10 messages per minute
  const MESSAGE_RATE_WINDOW = 60000; // 1 minute in milliseconds
  const MESSAGE_DEBOUNCE_MS = 500; // 500ms debounce between sends
  const MAX_MESSAGE_LENGTH = 5000; // Max message length
  
  // Presence Subscription
  useEffect(() => {
    let mounted = true;
    
    const setupPresence = async () => {
      // Connect first if needed
      if (!socketService.connected) {
        await socketService.connect();
      }
      
      if (!mounted) return;

      // IMPORTANT: Set up listener BEFORE subscribing
      // The backend sends an immediate status update upon subscription
      socketService.onUserStatusChange((data) => {
        if (!mounted) return;
        if (data.userId === user._id) {
           if (__DEV__) {
             console.log('User status changed:', data.status);
           }
           setIsOnline(data.status === 'online');
        }
      });

      // Now subscribe to this user's presence
      socketService.subscribePresence(user._id);
    };

    setupPresence();

    return () => {
      mounted = false;
      socketService.unsubscribePresence(user._id);
      socketService.removeListener('user_status_change');
    };
  }, [user._id]);

  // Refresh badges on mount and unmount to ensure counts are accurate
  useEffect(() => {
      // Small delay to allow mark as read to propagate
      const timer = setTimeout(() => {
          updateBadgeCounts();
      }, 1000);
      
      return () => {
          clearTimeout(timer);
          updateBadgeCounts();
      };
  }, [updateBadgeCounts]);
  
  // Camera & Image State (must be declared before hooks that use them)
  const [imageModalVisible, setImageModalVisible] = useState(false);
  const [selectedImageUri, setSelectedImageUri] = useState(null);
  const [isViewOnce, setIsViewOnce] = useState(false);
  const [imageViewModalVisible, setImageViewModalVisible] = useState(false);
  const [currentViewImage, setCurrentViewImage] = useState(null);
  const [attachmentModalVisible, setAttachmentModalVisible] = useState(false);
  const [profanityModalVisible, setProfanityModalVisible] = useState(false);
  const [pendingMessage, setPendingMessage] = useState(null);

  const flatListRef = useRef(null);
  const isMountedRef = useRef(true);
  
  // scrollToBottom function (must be defined before hooks that use it)
  const scrollToBottom = useCallback(() => {
    if (!isMountedRef.current) return;
    try {
      if (flatListRef.current && messages.length > 0) {
        flatListRef.current.scrollToOffset({ offset: 0, animated: true });
      }
    } catch (error) {
      // Silently fail if FlatList is unmounted or ref is invalid
      console.warn('Error scrolling to bottom:', error);
    }
  }, [messages.length]);
  
  // File Upload Hook
  const { uploadAndSendAudio, uploadAndSendImage: uploadAndSendImageHook, uploadAndSendFile } = useFileUpload({
    user,
    userData,
    setMessages,
    scrollToBottom,
    replyToMessage,
  });
  
  // Image Picker Hook
  const { handleSelectImage, handleSelectFile, pickImage } = useImagePicker({
    setSelectedImageUri,
    setIsViewOnce,
    setImageModalVisible,
    uploadAndSendFile,
  });

  // Profanity filter with custom bad words for dating app
  const customBadWords = [
    // Add dating app specific inappropriate terms
    'unsolicited', 'nude', 'nudes', 'dickpic', 'dick pic',
    'send nudes', 'send pics', 'send photos', 'send pictures',
    'personal info', 'phone number', 'address', 'location',
    // Add more as needed
  ];

  // Initialize filter with error handling - use useMemo to avoid re-initializing on every render
  const filter = useMemo(() => {
    try {
      if (Filter && typeof Filter === 'function') {
        return new Filter({ list: customBadWords });
      }
    } catch (error) {
      console.error('Error initializing profanity filter:', error);
    }
    // Fallback filter
    return {
      isProfane: (text) => {
        const lowerText = text.toLowerCase();
        return customBadWords.some(word => lowerText.includes(word.toLowerCase()));
      }
    };
  }, []);

  // Sticker Hook
  const {
    stickerPickerVisible,
    setStickerPickerVisible,
    recentStickers,
    customStickers,
    handleStickerSelect,
    handleCreateSticker,
  } = useStickers(user, userData, setMessages, scrollToBottom);

  const typingTimeoutRef = useRef(null);
  const openSwipeableRef = useRef(null); // Track currently open swipeable
  const highlightTimeoutRef = useRef(null); // Track highlight timeout

  const handleSwipeableOpen = useCallback((ref) => {
    if (!isMountedRef.current) return;
    try {
      if (openSwipeableRef.current && openSwipeableRef.current !== ref) {
        openSwipeableRef.current.close();
      }
      openSwipeableRef.current = ref;
    } catch (error) {
      console.warn('Error handling swipeable open:', error);
    }
  }, []);
  const hintOpacity = useRef(new Animated.Value(0)).current;
  

  // Cleanup on unmount
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      // Close modal on unmount to prevent state updates
      try {
        setProfanityModalVisible(false);
        setPendingMessage(null);
      } catch (error) {
        // Ignore errors during cleanup
      }
      
      // Clear all timeouts
      if (highlightTimeoutRef.current) {
        clearTimeout(highlightTimeoutRef.current);
        highlightTimeoutRef.current = null;
      }
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = null;
      }
      
      // Clear refs
      openSwipeableRef.current = null;
      flatListRef.current = null;
    };
  }, []);

  // Message Action Handlers






  const scrollToMessage = useCallback((messageId) => {
    if (!isMountedRef.current) return;
    if (!messageId || !flatListRef.current) return;

    // Find the index of the message in the inverted list
    const messageIndex = messages.findIndex(m => m._id === messageId);
    
    if (messageIndex === -1) {
      if (isMountedRef.current) {
        Alert.alert('Message Not Found', 'The original message may have been deleted.');
      }
      return;
    }

    // Clear any existing highlight timeout
    if (highlightTimeoutRef.current) {
      clearTimeout(highlightTimeoutRef.current);
      highlightTimeoutRef.current = null;
    }

    // Scroll to the message
    try {
      if (!isMountedRef.current || !flatListRef.current) return;
      
      flatListRef.current.scrollToIndex({
        index: messageIndex,
        animated: true,
        viewPosition: 0.5, // Center the message on screen
      });

      // Highlight the message
      if (isMountedRef.current) {
        setHighlightedMessageId(messageId);
      }

      // Clear highlight after 2 seconds
      highlightTimeoutRef.current = setTimeout(() => {
        if (isMountedRef.current) {
          setHighlightedMessageId(null);
        }
        highlightTimeoutRef.current = null;
      }, 2000);
    } catch (error) {
      console.error('Error scrolling to message:', error);
      // Fallback: try scrollToOffset
      try {
        if (isMountedRef.current && flatListRef.current) {
          const estimatedOffset = messageIndex * 100; // Rough estimate
          flatListRef.current.scrollToOffset({ offset: estimatedOffset, animated: true });
        }
      } catch (fallbackError) {
        console.warn('Fallback scroll also failed:', fallbackError);
      }
    }
  }, [messages]);


  const handleTyping = (text) => {
    setInputText(text);
    
    // Send typing indicator to other user
    socketService.sendTyping(user._id, text.length > 0);
    
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    
    if (text.length > 0) {
      typingTimeoutRef.current = setTimeout(() => {
        socketService.sendTyping(user._id, false);
      }, 2000);
    }
  };

  const handleSend = async (messageTextOverride = null, bypassProfanityCheck = false) => {
    // If editing a message, handle edit instead
    if (editingMessage) {
      const actualText = messageTextOverride || inputText || '';
      if (actualText.trim() && actualText.trim() !== editingMessage.content) {
        await handleEdit(actualText.trim());
        setInputText('');
        return;
      } else {
        cancelEdit();
        setInputText('');
        return;
      }
    }
    if (!isMountedRef.current) return;
    
    // Prevent sending when already sending
    if (isSending) {
      return;
    }
    
    // Prevent sending when offline
    if (isOffline) {
      Alert.alert(
        'No Internet Connection',
        'Please check your connection and try again.',
        [{ text: 'OK' }]
      );
      return;
    }
    
    try {
      // Handle case where handleSend is called with an event object (from onPress)
      // If first param is an event object, ignore it and use inputText
      let actualTextOverride = messageTextOverride;
      if (messageTextOverride && typeof messageTextOverride === 'object' && messageTextOverride.nativeEvent) {
        // This is an event object, ignore it
        actualTextOverride = null;
      }
      
      // Safely get message text, ensuring it's a string - normalize first to handle any object cases
      const rawText = actualTextOverride || inputText || '';
      let messageText = normalizeContent(rawText);
      if (typeof messageText !== 'string') {
        messageText = String(messageText || '').trim();
      } else {
        messageText = messageText.trim();
      }
      
      // Sanitize message content
      messageText = sanitizeText(messageText);
      
      // Input validation
      if (!messageText) {
        return; // Empty message
      }
      
      if (messageText.length > MAX_MESSAGE_LENGTH) {
        Alert.alert(
          'Message Too Long',
          `Messages cannot exceed ${MAX_MESSAGE_LENGTH} characters. Your message is ${messageText.length} characters.`,
          [{ text: 'OK' }]
        );
        return;
      }
      
      // Rate limiting - debounce check
      const now = Date.now();
      const timeSinceLastSend = now - lastSendTimeRef.current;
      if (timeSinceLastSend < MESSAGE_DEBOUNCE_MS) {
        chatAnalytics.trackRateLimitHit('message_send');
        Alert.alert(
          'Too Fast',
          'Please wait a moment before sending another message.',
          [{ text: 'OK' }]
        );
        return;
      }
      
      // Rate limiting - messages per minute check
      const oneMinuteAgo = now - MESSAGE_RATE_WINDOW;
      sendTimestampsRef.current = sendTimestampsRef.current.filter(timestamp => timestamp > oneMinuteAgo);
      
      if (sendTimestampsRef.current.length >= MESSAGE_RATE_LIMIT) {
        chatAnalytics.trackRateLimitHit('message_per_minute');
        Alert.alert(
          'Rate Limit Exceeded',
          `You can only send ${MESSAGE_RATE_LIMIT} messages per minute. Please wait a moment.`,
          [{ text: 'OK' }]
        );
        return;
      }
      
      // Update rate limit tracking
      lastSendTimeRef.current = now;
      sendTimestampsRef.current.push(now);
      
      setIsSending(true);

      // Client-side profanity check (unless bypassed for "Send anyway")
      if (!bypassProfanityCheck && filter && filter.isProfane && filter.isProfane(messageText)) {
        chatAnalytics.trackProfanityDetected(messageText.length, false);
        // Show profanity warning modal instead of Alert
        if (isMountedRef.current) {
          setPendingMessage(messageText);
          setProfanityModalVisible(true);
        }
        return; // Exit function, prevent sending
      }

      // Log attempt to send
      if (__DEV__) {
        console.log(`[handleSend] Sending message to: ${user.displayName} (${user._id})`);
      }

      // Proceed with sending the message
      const tempId = Date.now().toString();
      // Ensure content is always a string
      const normalizedContent = normalizeContent(messageText);
      const message = {
        _id: tempId,
        tempId,
        content: normalizedContent,
        senderId: { _id: userData._id },
        receiverId: user._id,
        createdAt: new Date().toISOString(),
        status: 'sent',
        replyTo: replyToMessage,
        };

      // For inverted list, add to START (bottom of screen)
      if (isMountedRef.current) {
        setMessages((prev) => [message, ...prev]);
        setInputText('');
        setReplyToMessage(null);
        scrollToBottom();
      }

      const sendStartTime = Date.now();
      try {
        await socketService.sendMessage(
          user._id, 
          message.content, 
          tempId, 
          'text', 
          null, 
          null, 
          replyToMessage?._id, // Pass replyTo ID
          { bypassProfanityCheck: bypassProfanityCheck } // Pass bypass flag
        );
        
        // Track successful send
        const sendDuration = Date.now() - sendStartTime;
        chatAnalytics.trackMessageSent('text', !!replyToMessage, messageText.length);
        chatAnalytics.trackAPICall('send_message', sendDuration, true);
      } catch (error) {
        if (__DEV__) {
          console.error('Send message error:', error);
        }
        
        // Track failed send
        const sendDuration = Date.now() - sendStartTime;
        chatAnalytics.trackMessageSendFailed(error, 'text');
        chatAnalytics.trackAPICall('send_message', sendDuration, false);
        
        // Remove optimistic message on error
        if (isMountedRef.current) {
          setMessages((prev) => prev.filter(m => m.tempId !== tempId));
          const errorMessage = error?.response?.data?.message || 
                              error?.message || 
                              'Failed to send message. Please try again.';
          Alert.alert('Error', errorMessage);
        }
      } finally {
        setIsSending(false);
      }
    } catch (error) {
      if (__DEV__) {
        console.error('Error in handleSend:', error);
      }
      setIsSending(false);
      Alert.alert('Error', 'An error occurred while sending the message.');
    }
  };

  const handleKeepEditing = () => {
    if (!isMountedRef.current) return;
    setProfanityModalVisible(false);
    setPendingMessage(null);
    // Keep the text in the input so user can edit
  };

  const handleSendAnyway = () => {
    if (!isMountedRef.current) return;
    if (pendingMessage) {
      setProfanityModalVisible(false);
      const messageToSend = pendingMessage;
      setPendingMessage(null);
      // Send the message anyway, bypassing profanity check
      handleSend(messageToSend, true);
    }
  };

  const handleMatchResponse = async (action, isConfirmed = false) => {
      // If action is decline and we haven't confirmed yet, show sheet
      if (action === 'decline' && !isConfirmed) {
          setDeclineSheetVisible(true);
          return;
      }
      
      // If we are confirming decline (called from sheet) or accepting
      try {
          const matchId = route.params.matchId; 
          if (!matchId) {
             showAlert('Error', 'Match ID not found', 'error');
             return;
          }

          if (action === 'accept') setIsAccepting(true);

          await respondToMatch(matchId, action);
          
          if (action === 'accept') {
              setMatchStatus('active');
              // Update route params to reflect active status immediately
              navigation.setParams({ matchStatus: 'active' });
              
              showAlert(
                  'Connected!',
                  `You are now connected with ${user.displayName || user.name}. Start chatting!`,
                  'success',
                  null
              );
          } else {
              if (navigation.canGoBack()) {
                  navigation.goBack();
              } else {
                  navigation.navigate('MainTab', { screen: 'Messages' });
              }
          }
      } catch (error) {
          console.error("Match Response Error:", error);
          showAlert("Error", "Failed to update match status", 'error');
      } finally {
        setIsAccepting(false);
      }
  };

  // Listen for server-side message errors (profanity detected)
  useEffect(() => {
    const handleMessageError = (error) => {
      if (error && error.message) {
        Alert.alert(
          'Message Rejected',
          error.message,
          [{ text: 'OK' }]
        );
      }
    };

    socketService.onMessageError(handleMessageError);

    return () => {
      socketService.removeListener('message_error');
    };
  }, [user._id]);

  // Unused local handleAudioSend removed - using useFileUpload hook instead

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


  // Attachment Functions
  const handleAttachmentPress = () => {
    setAttachmentModalVisible(true);
  };

  const uploadAndSendImage = async (uri, viewOnce) => {
    setImageModalVisible(false);
    setSelectedImageUri(null);
    setIsViewOnce(false);
    // Use the hook function directly
    await uploadAndSendImageHook(uri, viewOnce);
  };


  // Handle Image Press
  const handleImagePress = (item) => {
    if (item.isViewOnce) {
      if (__DEV__) {
        console.log('handleImagePress item:', item);
      }
      const isMine = item.senderId._id === userData._id;
      
      if (isMine) {
        Alert.alert('View Once', 'You sent this photo as View Once.');
        return;
      }

      if (viewedMessages.includes(item._id)) {
        Alert.alert('Opened', 'This photo has already been viewed.');
        return;
      }

      // Mark as viewed locally
      setViewedMessages(prev => [...prev, item._id]);
      
      // Notify sender via socket
      socketService.notifyViewOnceOpened(item._id);
      
      setCurrentViewImage(item.imageUrl);
      setImageViewModalVisible(true);
    } else {
      setCurrentViewImage(item.imageUrl);
      setImageViewModalVisible(true);
    }
  };

  // Sticker Functions



  const renderMessage = useCallback(({ item }) => (
    <MessageItem 
      item={item} 
      userData={userData} 
      user={user} 
      handleLongPress={handleLongPress}
      setReplyToMessage={setReplyToMessage}
      onSwipeableOpen={handleSwipeableOpen}
      scrollToMessage={scrollToMessage}
      highlightedMessageId={highlightedMessageId}
      onImagePress={handleImagePress}
      viewedMessages={viewedMessages}
    />
  ), [userData, user, handleLongPress, handleSwipeableOpen, scrollToMessage, highlightedMessageId, handleImagePress, viewedMessages]);

  // Render
  return (
    <SafeAreaView style={styles.container} edges={Platform.OS === 'android' ? ['top', 'bottom'] : ['top']}>
      <ChatHeader 
        user={user} 
        matchStatus={matchStatus} 
        isOtherUserInChat={isOtherUserInChat && isOnline}
        isRemoteRecording={isRemoteRecording}
        isTyping={isTyping}
        isOnline={isOnline}
        navigation={navigation}
        onAudioCall={() => startCall(user, 'audio')}
        onVideoCall={() => startCall(user, 'video')}
        callState={callState}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        isSearchMode={isSearchMode}
        onSearchToggle={setIsSearchMode}
      />

      {/* Offline Banner */}
      {isOffline && (
        <View style={styles.offlineBanner}>
          <Ionicons name="cloud-offline-outline" size={18} color="#FFFFFF" />
          <Text style={styles.offlineText}>No Internet Connection</Text>
        </View>
      )}

      {/* Error Banner */}
      {messagesError && (
        <View style={styles.errorBanner}>
          <View style={styles.errorContent}>
            <Ionicons name="alert-circle" size={20} color="#FF4444" />
            <Text style={styles.errorText}>{messagesError.message}</Text>
          </View>
          <TouchableOpacity 
            onPress={() => {
              setMessagesError(null);
              if (messagesError.retry) {
                messagesError.retry();
              }
            }}
            style={styles.errorRetryButton}
          >
            <Text style={styles.errorRetryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Cache Indicator */}
      {isShowingCached && messages.length > 0 && (
        <View style={styles.cacheIndicator}>
          <Ionicons name="time-outline" size={16} color="#666" />
          <Text style={styles.cacheIndicatorText}>Showing cached messages</Text>
        </View>
      )}

      {/* Pinned Message Banner */}
      <PinnedMessageBanner 
        pinnedMessage={pinnedMessage}
        userData={userData}
        scrollToMessage={scrollToMessage}
      />

      {loading && messages.length === 0 ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#D4AF37" />
          <Text style={styles.loadingText}>Loading messages...</Text>
        </View>
      ) : messagesError && messages.length === 0 ? (
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={64} color="#FF4444" />
          <Text style={styles.errorTitle}>Failed to Load Messages</Text>
          <Text style={styles.errorMessage}>{messagesError.message}</Text>
          <TouchableOpacity 
            onPress={() => {
              setMessagesError(null);
              if (messagesError.retry) {
                messagesError.retry();
              }
            }}
            style={styles.errorRetryButtonLarge}
          >
            <Text style={styles.errorRetryTextLarge}>Try Again</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          ref={flatListRef}
          data={searchQuery 
            ? messages.filter(msg => 
                normalizeContent(msg.content || '').toLowerCase().includes(searchQuery.toLowerCase())
              )
            : messages
          }
          renderItem={renderMessage}
          keyExtractor={(item) => item._id || item.tempId}
          inverted
          contentContainerStyle={styles.messagesList}
          onEndReached={!searchQuery ? loadMoreMessages : undefined}
          onEndReachedThreshold={0.2}
          ListFooterComponent={isLoadingMore ? <ActivityIndicator size="small" color="#D4AF37" /> : null}
          ListEmptyComponent={
            !loading && messages.length === 0 ? (
              <View style={styles.emptyStateContainer}>
                <Ionicons name="chatbubbles-outline" size={80} color="#D4AF37" />
                <Text style={styles.emptyStateTitle}>Start the Conversation</Text>
                <Text style={styles.emptyStateText}>
                  Send a message to {user.displayName || user.name} to begin chatting!
                </Text>
              </View>
            ) : searchQuery && messages.filter(msg => 
              normalizeContent(msg.content || '').toLowerCase().includes(searchQuery.toLowerCase())
            ).length === 0 ? (
              <View style={styles.emptyStateContainer}>
                <Ionicons name="search-outline" size={64} color="#999" />
                <Text style={styles.emptyStateTitle}>No Messages Found</Text>
                <Text style={styles.emptyStateText}>
                  No messages match "{searchQuery}"
                </Text>
              </View>
            ) : null
          }
          // Performance optimizations
          removeClippedSubviews={true}
          maxToRenderPerBatch={10}
          updateCellsBatchingPeriod={50}
          initialNumToRender={20}
          windowSize={10}
          getItemLayout={(data, index) => ({
            length: 80, // Estimated average message height
            offset: 80 * index,
            index,
          })}
        />
      )}

      {/* Show pending UI if status is pending OR if it's a super like request we haven't answered yet */}
      {(matchStatus === 'pending' || (isSuperLike && !isInitiator && matchStatus !== 'active')) ? (
        <View style={[styles.pendingInputContainer, { paddingBottom: Math.max(insets.bottom, 24) }]}>
          {isInitiator ? (
             <>
               <Ionicons name="lock-closed-outline" size={24} color="#999" />
               <Text style={styles.pendingInputText}>
                 Waiting for {user.displayName || user.name} to like you back
               </Text>
             </>
          ) : (
            <View style={{ alignItems: 'center', width: '100%', paddingHorizontal: 20 }}>
               {/* Super Like Message Header if applicable */}
               {route.params.isSuperLike && (
                   <View style={{ marginBottom: 20, alignItems: 'center', width: '100%' }}>
                       <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                           <Ionicons name="star" size={24} color="#D4AF37" />
                           <Text style={{ color: '#D4AF37', fontWeight: 'bold', marginLeft: 6, fontSize: 18 }}>Super Like!</Text>
                       </View>
                       
                       {superLikeMessage && (
                           <View style={{ 
                               backgroundColor: '#FFF9E6', 
                               padding: 16, 
                               borderRadius: 16, 
                               borderWidth: 1, 
                               borderColor: '#D4AF37',
                               width: '100%',
                               marginTop: 8
                           }}>
                               <Text style={{ 
                                   fontSize: 16, 
                                   color: '#000', 
                                   fontStyle: 'italic', 
                                   textAlign: 'center',
                                   lineHeight: 22
                               }}>
                                   "{superLikeMessage}"
                               </Text>
                           </View>
                       )}
                   </View>
               )}
               
               <Text style={[styles.pendingInputText, { marginBottom: 24, textAlign: 'center' }]}>
                 {user.displayName || user.name} wants to connect with you.
               </Text>
               
               <View style={{ flexDirection: 'row', gap: 16, width: '100%' }}>
                  <TouchableOpacity 
                    style={{ flex: 1, backgroundColor: '#F0F0F0', padding: 14, borderRadius: 24, alignItems: 'center' }}
                    onPress={() => handleMatchResponse('decline')}
                  >
                     <Text style={{ color: 'black', fontWeight: '600' }}>Decline</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity 
                    style={{ flex: 1, backgroundColor: '#D4AF37', padding: 14, borderRadius: 24, alignItems: 'center' }}
                    onPress={() => handleMatchResponse('accept')}
                    disabled={isAccepting}
                  >
                     {isAccepting ? (
                       <ActivityIndicator size="small" color="#FFF" />
                     ) : (
                       <Text style={{ color: '#FFF', fontWeight: '700' }}>Accept</Text>
                     )}
                  </TouchableOpacity>
               </View>
            </View>
          )}
        </View>
      ) : (
        <KeyboardAvoidingView
          behavior='padding'
          keyboardVerticalOffset={0}
          style={styles.inputWrapper}
        >
          <View>
            {/* Reply Preview */}
            {replyToMessage && (
              <View style={styles.replyPreview}>
                <View style={styles.replyBar} />
                <View style={styles.replyContent}>
                  <Text style={styles.replyName}>
                    {replyToMessage.senderId._id === userData._id ? 'You' : user.name}
                  </Text>
                  <Text style={styles.replyText} numberOfLines={1}>
                    {replyToMessage.messageType === 'audio' ? '🎤 Audio Message' : normalizeContent(replyToMessage.content)}
                  </Text>
                </View>
                <TouchableOpacity onPress={() => setReplyToMessage(null)}>
                  <Ionicons name="close-circle" size={20} color="#999" />
                </TouchableOpacity>
              </View>
            )}

            {/* Chat Input */}
            <ChatInput
              isRecording={isRecording}
              recordingDuration={recordingDuration}
              slideX={slideX}
              slideXRef={slideXRef}
              inputText={inputText}
              handleTyping={handleTyping}
              handleSend={handleSend}
              isEditing={!!editingMessage}
              handleAudioSend={(data) => {
                if (data && data.uri) {
                  uploadAndSendAudio(data.uri, data.duration);
                }
              }}
              onAttachmentPress={handleAttachmentPress}
              pickImage={pickImage}
              setStickerPickerVisible={setStickerPickerVisible}
              handleMicPressIn={handleMicPressIn}
              handleMicMove={handleMicMove}
              handleMicPressOut={handleMicPressOut}
              handleRecordingContainerStart={handleRecordingContainerStart}
              handleRecordingContainerMove={handleRecordingContainerMove}
              handleRecordingContainerEnd={handleRecordingContainerEnd}
              cancelRecording={cancelRecording}
              stopRecording={stopRecording}
              showHoldToRecordHint={showHoldToRecordHint}
              disabled={isSending || isOffline}
            />
            
            {/* Hold to Record Hint - Moved here to stay above keyboard */}
            {showHoldHint && (
              <Animated.View style={[styles.holdHintContainer, { opacity: hintOpacity }]}>
                <Ionicons name="hand-left" size={20} color="#FFF" style={{ marginRight: 8 }} />
                <Text style={styles.holdHintText}>Hold mic button to record</Text>
              </Animated.View>
            )}
          </View>
        </KeyboardAvoidingView>
      )}

      {/* Modals */}
      <StickerPicker
        visible={stickerPickerVisible}
        onClose={() => setStickerPickerVisible(false)}
        onStickerSelect={handleStickerSelect}
        onCreateSticker={handleCreateSticker}
        recentStickers={recentStickers}
        customStickers={customStickers}
      />

      <AttachmentOptionsModal
        visible={attachmentModalVisible}
        onClose={() => setAttachmentModalVisible(false)}
        onSelectImage={handleSelectImage}
        onSelectFile={handleSelectFile}
      />

      <ImagePreviewModal
        visible={imageModalVisible}
        imageUri={selectedImageUri}
        isViewOnce={isViewOnce}
        onViewOnceToggle={() => setIsViewOnce(!isViewOnce)}
        onClose={() => {
          setImageModalVisible(false);
          setSelectedImageUri(null);
          setIsViewOnce(false);
        }}
        onSend={uploadAndSendImage}
      />

      <ImageViewModal
        visible={imageViewModalVisible}
        imageUri={currentViewImage}
        onClose={() => {
          setImageViewModalVisible(false);
          setCurrentViewImage(null);
        }}
      />

      <MessageActionSheet
        visible={showActionSheet}
        selectedMessage={selectedMessage}
        onClose={() => setShowActionSheet(false)}
        onReply={handleReply}
        onPin={handlePin}
        onStar={handleStar}
        onEdit={startEdit}
        onForward={startForward}
        onReaction={handleReaction}
        onDelete={confirmDelete}
        userData={userData}
        isMine={selectedMessage?.senderId?._id === userData._id}
        isActionLoading={isActionLoading}
      />

      <ForwardConversationModal
        visible={showForwardModal}
        onClose={cancelForward}
        onSelectConversation={handleForward}
        currentUserId={user._id}
        messageToForward={forwardingMessage}
      />

      <ProfanityWarningModal
        visible={profanityModalVisible}
        messageText={pendingMessage || ''}
        userPhoto={(userData?.photos && userData.photos.length > 0
          ? (userData.photos[userData.mainPhotoIndex ?? 0]?.url || userData.photos[userData.mainPhotoIndex ?? 0] || userData.photos[0]?.url || userData.photos[0])
          : null)}
        userName={userData?.displayName || userData?.name || 'You'}
        onKeepEditing={handleKeepEditing}
        onSendAnyway={handleSendAnyway}
      />

      {/* Hold to Record Hint - Shows on first tap */}
      {/* Moved inside KeyboardAvoidingView is handled above */}
      {/* Custom Alert */}
      <CustomAlert
        visible={alertConfig.visible}
        title={alertConfig.title}
        message={alertConfig.message}
        type={alertConfig.type}
        onClose={hideAlert}
        buttons={[
            {
                text: 'OK',
                onPress: hideAlert
            }
        ]}
      />
      <DeclineConfirmationSheet
        isVisible={declineSheetVisible}
        onClose={() => setDeclineSheetVisible(false)}
        onConfirm={() => {
            setDeclineSheetVisible(false);
            handleMatchResponse('decline', true); 
        }}
      />
    </SafeAreaView>
  );
};



export default ChatScreen;
