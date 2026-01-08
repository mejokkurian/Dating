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
            <Text style={[styles.messageText, isMine ? styles.myMessageText : styles.theirMessageText]}>
              {safeContent || ' '}
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
  const { user, matchStatus, isInitiator } = route.params;
  const { userData } = useAuth();
  const { startCall, callState } = useCall();
  const isMine = userData._id === user._id;

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
    handleDelete,
    confirmDelete,
  } = useMessageActions(userData);
  
  const [highlightedMessageId, setHighlightedMessageId] = useState(null);
  const [showHoldHint, setShowHoldHint] = useState(false);
  const [inputText, setInputText] = useState('');
  const [isOnline, setIsOnline] = useState(false);
  
  // Presence Subscription
  useEffect(() => {
    let mounted = true;
    
    const setupPresence = async () => {
      // Connect first if needed
      if (!socketService.connected) {
        await socketService.connect();
      }
      
      if (!mounted) return;

      // Subscribe to this user's presence
      socketService.subscribePresence(user._id);
      
      // Listen for status changes
      socketService.onUserStatusChange((data) => {
        if (!mounted) return;
        if (data.userId === user._id) {
           console.log('User status changed:', data.status);
           setIsOnline(data.status === 'online');
        }
      });
    };

    setupPresence();

    return () => {
      mounted = false;
      socketService.unsubscribePresence(user._id);
      socketService.removeListener('user_status_change');
    };
  }, [user._id]);
  
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
    if (!isMountedRef.current) return;
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
      if (!messageText) return;

      // Client-side profanity check (unless bypassed for "Send anyway")
      if (!bypassProfanityCheck && filter && filter.isProfane && filter.isProfane(messageText)) {
        // Show profanity warning modal instead of Alert
        if (isMountedRef.current) {
          setPendingMessage(messageText);
          setProfanityModalVisible(true);
        }
        return; // Exit function, prevent sending
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
      } catch (error) {
        console.error('Send message error:', error);
        // Remove optimistic message on error
        if (isMountedRef.current) {
          setMessages((prev) => prev.filter(m => m.tempId !== tempId));
          Alert.alert('Error', 'Failed to send message. Please try again.');
        }
      }
    } catch (error) {
      console.error('Error in handleSend:', error);
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
      console.log('handleImagePress item:', item);
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
      />

      {/* Pinned Message Banner */}
      <PinnedMessageBanner 
        pinnedMessage={pinnedMessage}
        userData={userData}
        scrollToMessage={scrollToMessage}
      />

      <FlatList
        ref={flatListRef}
        data={messages}
        renderItem={renderMessage}
        keyExtractor={(item) => item._id || item.tempId}
        inverted
        contentContainerStyle={styles.messagesList}
        onEndReached={loadMoreMessages}
        onEndReachedThreshold={0.2}
        ListFooterComponent={isLoadingMore ? <ActivityIndicator size="small" color="#D4AF37" /> : null}
      />

      {matchStatus === 'pending' ? (
        <View style={styles.pendingInputContainer}>
          <Ionicons name="lock-closed-outline" size={24} color="#999" />
          <Text style={styles.pendingInputText}>
            {isInitiator 
              ? `Waiting for ${user.displayName || user.name} to like you back`
              : 'Swipe right on their profile to start chatting'}
          </Text>
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
        onDelete={confirmDelete}
        userData={userData}
        isMine={selectedMessage?.senderId?._id === userData._id}
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
    </SafeAreaView>
  );
};



export default ChatScreen;
