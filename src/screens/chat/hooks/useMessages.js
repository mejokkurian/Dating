import { useState, useEffect, useRef, useCallback } from 'react';
import { Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import socketService from '../../../services/socket';
import { getMessages } from '../../../services/api/chat';
import { normalizeContent } from '../../../utils/messageContent';
import { getCachedMessages, cacheMessages, cacheMessage, getLastSyncTime } from '../../../services/MessageCache';

// Now using the shared normalizeContent from utils

const useMessages = (user, userData) => {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [isTyping, setIsTyping] = useState(false);
  const [isOtherUserInChat, setIsOtherUserInChat] = useState(false);
  const [isRemoteRecording, setIsRemoteRecording] = useState(false);
  const [viewedMessages, setViewedMessages] = useState([]);
  const [pinnedMessage, setPinnedMessage] = useState(null);
  
  // Use ref for pinnedMessage to access in socket callbacks without triggering re-effect
  const pinnedMessageRef = useRef(null);
  
  // FIX 3: Race prevention - track if API fetch is in progress
  const isFetchingRef = useRef(false);
  
  // Update ref when state changes
  useEffect(() => {
    pinnedMessageRef.current = pinnedMessage;
  }, [pinnedMessage]);

  const loadMessages = async () => {
    // FIX 3: Prevent concurrent API fetches
    if (isFetchingRef.current) {
      console.log('⏭️ Skipping fetch - already in progress');
      return;
    }

    try {
      // Generate conversation ID
      const ids = [userData._id, user._id].sort();
      const conversationId = `${ids[0]}_${ids[1]}`;
      
      // 1. Load from cache FIRST (instant UI)
      const cached = getCachedMessages(conversationId, 50);
      if (cached.length > 0) {
        console.log(`✅ Loaded ${cached.length} messages from cache`);
        setMessages(cached);
        setLoading(false); // UI shows immediately!
      }

      // FIX 1: Incremental sync - get last message timestamp
      const lastSync = getLastSyncTime(conversationId);
      console.log(`🔄 Syncing messages since: ${lastSync ? new Date(lastSync).toISOString() : 'beginning'}`);

      // 2. Fetch from API in background (only new messages)
      isFetchingRef.current = true;
      const data = await getMessages(user._id, lastSync ? new Date(lastSync).toISOString() : null, 50);
      isFetchingRef.current = false;
      
      // Normalize content to ensure it's always a string
      const normalizedData = data.map(msg => ({
        ...msg,
        content: normalizeContent(msg.content)
      }));
      
      // 3. Update cache with fresh data
      if (normalizedData.length > 0) {
        cacheMessages(normalizedData);
        console.log(`✅ Cached ${normalizedData.length} new messages`);
      }
      
      // FIX 2: Merge instead of replace (prevents flicker)
      setMessages(prev => {
        const merged = [...prev];
        
        normalizedData.forEach(newMsg => {
          // Only add if not already in list
          if (!merged.find(m => m._id === newMsg._id)) {
            merged.push(newMsg);
          }
        });
        
        // Sort by createdAt descending (newest first for inverted list)
        return merged.sort((a, b) => 
          new Date(b.createdAt) - new Date(a.createdAt)
        );
      });
      
      setHasMore(normalizedData.length >= 50);
      
      // Mark all as read if we have messages
      if (normalizedData.length > 0) {
        socketService.markAsRead(normalizedData[0].conversationId);
      }
    } catch (error) {
      console.error('Load messages error:', error);
      isFetchingRef.current = false;
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
        // Normalize content to ensure it's always a string
        const normalizedData = data.map(msg => ({
          ...msg,
          content: normalizeContent(msg.content)
        }));
        
        setMessages(prev => {
          // Filter out any messages that already exist in prev
          const newMessages = normalizedData.reverse().filter(newMsg => 
            !prev.some(existingMsg => existingMsg._id === newMsg._id)
          );
          return [...prev, ...newMessages];
        });
        setHasMore(normalizedData.length >= 50);
      } else {
        setHasMore(false);
      }
    } catch (error) {
      console.error('Load more messages error:', error);
    } finally {
      setIsLoadingMore(false);
    }
  };

  // CRITICAL: Clear messages immediately when user changes to prevent showing wrong chat
  useEffect(() => {
    setMessages([]);
    setLoading(true);
    setHasMore(true);
    setPinnedMessage(null);
  }, [user._id]);

  useEffect(() => {
    let mounted = true;

    const initSocket = async () => {
      await socketService.connect();
      
      if (!mounted) return;

      // Join chat room to notify other user
      socketService.joinChat(user._id);

      // Listen for new messages
      socketService.onNewMessage((message) => {
        if (!mounted) return;
        if (message.senderId._id === user._id || message.receiverId === user._id) {
          // Normalize message content to ensure it's always a string
          const normalizedMessage = {
            ...message,
            content: normalizeContent(message.content)
          };
          
          // Cache the message
          cacheMessage(normalizedMessage);
          
          setMessages((prev) => {
            if (!mounted) return prev;
            // Check for duplicates
            const existingIndex = prev.findIndex(m => m._id === normalizedMessage._id || (normalizedMessage.tempId && m.tempId === normalizedMessage.tempId));
            
            if (existingIndex !== -1) {
              // Update existing message - ensure content is normalized
              const newMessages = [...prev];
              const existingMsg = newMessages[existingIndex];
              newMessages[existingIndex] = { 
                ...existingMsg, 
                ...normalizedMessage,
                content: normalizeContent(normalizedMessage.content || existingMsg.content)
              };
              return newMessages;
            }
            
            // For inverted list, new messages go to START (bottom of screen)
            // Check if message already exists (by _id or tempId)
            const exists = prev.some(m => 
              m._id === normalizedMessage._id || 
              (normalizedMessage.tempId && m.tempId === normalizedMessage.tempId)
            );

            if (exists) {
              // Update existing message instead of appending - ensure content is normalized
              return prev.map(m => {
                if (m._id === normalizedMessage._id || (normalizedMessage.tempId && m.tempId === normalizedMessage.tempId)) {
                  return {
                    ...normalizedMessage,
                    content: normalizeContent(normalizedMessage.content || m.content)
                  };
                }
                return m;
              });
            }
            
            // Ensure content is normalized one more time before adding to state
            const finalMessage = {
              ...normalizedMessage,
              content: normalizeContent(normalizedMessage.content)
            };
            return [finalMessage, ...prev];
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
        if (!mounted) return;
        // Normalize message content to ensure it's always a string
        const normalizedMessage = {
          ...message,
          content: normalizeContent(message.content)
        };
        
        // Cache the sent message
        cacheMessage(normalizedMessage);
        
        setMessages((prev) => {
          if (!mounted) return prev;
          // Check if the real message was already added by onNewMessage (race condition)
          const realMessageExists = prev.some(m => m._id === normalizedMessage._id);
          
          if (realMessageExists) {
            // If real message exists, remove the optimistic one to avoid duplicates
            return prev.filter(m => m.tempId !== normalizedMessage.tempId);
          }
          
          // Otherwise, update the optimistic message with real data - ensure content is normalized
          return prev.map((m) => {
            if (m.tempId === normalizedMessage.tempId) {
              return {
                ...normalizedMessage,
                content: normalizeContent(normalizedMessage.content || m.content)
              };
            }
            return m;
          });
        });
      });

      // Listen for message errors (e.g., profanity detected on server)
      socketService.onMessageError((error) => {
        if (!mounted) return;
        setMessages((prev) => {
          if (!mounted) return prev;
          // Remove the optimistic message that was rejected
          return prev.filter(m => m.tempId !== error.tempId);
        });
      });

      // Listen for delivery updates
      socketService.onMessageDelivered(({ messageId, status }) => {
        if (!mounted) return;
        setMessages((prev) => {
          if (!mounted) return prev;
          return prev.map((m) => (m._id === messageId ? { ...m, status } : m));
        });
      });

      // Listen for read updates
      socketService.onMessagesRead(({ conversationId }) => {
        if (!mounted) return;
        setMessages((prev) => {
          if (!mounted) return prev;
          return prev.map((m) => 
            m.conversationId === conversationId && m.senderId._id === userData._id
              ? { ...m, status: 'read', read: true } 
              : m
          );
        });
      });

      // Listen for typing indicator
      socketService.onUserTyping(({ userId, isTyping }) => {
        if (!mounted) return;
        if (userId === user._id) {
          setIsTyping(isTyping);
        }
      });

      // Listen for recording indicator
      socketService.onUserRecording(({ userId, isRecording }) => {
        if (!mounted) return;
        if (userId === user._id) {
          setIsRemoteRecording(isRecording);
        }
      });

      // Listen for presence (joined chat)
      socketService.onUserJoinedChat(({ userId }) => {
        if (!mounted) return;
        if (userId === user._id) {
          setIsOtherUserInChat(true);
          // Acknowledge presence so they know we are here too
          socketService.ackPresence(user._id);
        }
      });

      // Listen for presence (left chat)
      socketService.onUserLeftChat(({ userId }) => {
        if (!mounted) return;
        if (userId === user._id) {
          setIsOtherUserInChat(false);
        }
      });

      // Listen for presence acknowledgment
      socketService.onPresenceAck(({ userId }) => {
        if (!mounted) return;
        if (userId === user._id) {
          setIsOtherUserInChat(true);
        }
      });

      // Listen for pinned messages
      socketService.onMessagePinned((data) => {
        if (!mounted) return;
        const { messageId, isPinned, pinnedMessage: updatedMessage } = data;
        
        // Update local messages state
        setMessages(prev => {
          if (!mounted) return prev;
          return prev.map(msg => 
            msg._id === messageId ? { ...msg, isPinned } : msg
          );
        });

        // Update pinned message state
        if (isPinned && updatedMessage) {
          setPinnedMessage(updatedMessage);
        } else if (!isPinned && pinnedMessageRef.current?._id === messageId) {
          setPinnedMessage(null);
        }
      });

      // Listen for starred messages
      socketService.onMessageStarred((data) => {
        if (!mounted) return;
        const { messageId, isStarred, starredBy } = data;
        
        // Update local messages state
        setMessages(prev => {
          if (!mounted) return prev;
          return prev.map(msg => 
            msg._id === messageId ? { ...msg, starredBy } : msg
          );
        });
      });

      // Listen for deleted messages
      socketService.onMessageDeleted((data) => {
        if (!mounted) return;
        const { messageId, deletedForEveryone } = data;
        
        setMessages(prev => {
          if (!mounted) return prev;
          return prev.map(msg => {
            if (msg._id === messageId) {
              if (deletedForEveryone) {
                return { ...msg, deletedForEveryone: true, content: 'This message was deleted' };
              }
              // For "delete for me", we filter it out in the render or mark it
              return { ...msg, deletedFor: [...(msg.deletedFor || []), userData._id] };
            }
            return msg;
          });
        });
      });

      // Listen for View Once opened notifications
      socketService.onViewOnceOpened((data) => {
        if (!mounted) return;
        const { messageId } = data;
        
        // Mark message as viewed in local state
        setViewedMessages(prev => [...prev, messageId]);
      });
    };

    loadMessages();
    initSocket();

    return () => {
      mounted = false;
      try {
        // Cleanup specific listeners
        socketService.removeListener('new_message');
        socketService.removeListener('message_sent');
        socketService.removeListener('message_error');
        socketService.removeListener('message_delivered');
        socketService.removeListener('messages_read');
        socketService.removeListener('user_typing');
        socketService.removeListener('user_recording');
        socketService.removeListener('user_joined_chat');
        socketService.removeListener('user_left_chat');
        socketService.removeListener('chat_presence_ack');
        socketService.removeListener('message_pinned');
        socketService.removeListener('message_starred');
        socketService.removeListener('message_deleted');
        socketService.removeListener('view_once_opened');
        
        // Leave chat room
        try {
          socketService.leaveChat(user._id);
        } catch (error) {
          console.warn('Error leaving chat:', error);
        }
        
        // NOTE: Do NOT disconnect socket here as it may interrupt other active screens/sessions
        // The socket service manages connection based on AppState and Auth
      } catch (error) {
        console.warn('Error during cleanup:', error);
      }
    };
  }, [user._id, userData._id]);

  return {
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
  };
};

export default useMessages;
