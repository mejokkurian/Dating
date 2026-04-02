import { useState, useEffect, useRef, useCallback } from 'react';
import { Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import socketService from '../../../services/socket';
import { getMessages } from '../../../services/api/chat';
import { normalizeContent } from '../../../utils/messageContent';
import { getCachedMessages, cacheMessages, cacheMessage, getLastSyncTime, deleteCachedMessage } from '../../../services/MessageCache';
import * as chatAnalytics from '../../../services/chatAnalytics';

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
  const [error, setError] = useState(null);
  const [isShowingCached, setIsShowingCached] = useState(false);
  
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
      if (__DEV__) {
        console.log('⏭️ Skipping fetch - already in progress');
      }
      return;
    }

    // Clear previous error
    setError(null);

    try {
      // Generate conversation ID
      const ids = [userData._id, user._id].sort();
      const conversationId = `${ids[0]}_${ids[1]}`;
      
      // 1. Load from cache FIRST (instant UI)
      const cached = getCachedMessages(conversationId, 50);
      // Filter out messages deleted for current user
      const filteredCached = cached.filter(msg => {
        // Don't show messages deleted for me
        if (msg.deletedFor?.includes(userData._id)) {
          return false;
        }
        return true;
      });
      const loadStartTime = Date.now();
      if (filteredCached.length > 0) {
        if (__DEV__) {
          console.log(`✅ Loaded ${filteredCached.length} messages from cache (filtered ${cached.length - filteredCached.length} deleted)`);
        }
        setMessages(filteredCached);
        setLoading(false); // UI shows immediately!
        setIsShowingCached(true); // Show cache indicator
        chatAnalytics.trackConversationLoaded(filteredCached.length, true);
      }

      // 2. Always fetch the latest 50 messages from API (no before parameter)
      // This ensures we get all recent messages, including those that arrived
      // while the chat screen was closed
      isFetchingRef.current = true;
      const data = await getMessages(user._id, null, 50); // null = fetch latest messages
      isFetchingRef.current = false;
      
      const loadDuration = Date.now() - loadStartTime;
      chatAnalytics.trackAPICall('get_messages', loadDuration, true);
      
      if (__DEV__) {
        console.log(`🔄 Fetched ${data.length} messages from API`);
      }
      
      // Normalize content to ensure it's always a string
      const normalizedData = data.map(msg => ({
        ...msg,
        content: normalizeContent(msg.content)
      }));
      
      // Filter out messages deleted for current user
      const filteredData = normalizedData.filter(msg => {
        // Don't show messages deleted for me
        if (msg.deletedFor?.includes(userData._id)) {
          return false;
        }
        return true;
      });
      
      // 3. Update cache with fresh data (only non-deleted messages)
      // Also delete any cached messages that are now deleted for me
      // IMPORTANT: Always cache API response to ensure cache has latest edited content
      if (normalizedData.length > 0) {
        // Cache only messages that are not deleted for current user
        const messagesToCache = normalizedData.filter(msg => {
          if (msg.deletedFor?.includes(userData._id)) {
            // Delete from cache if it's deleted for me
            deleteCachedMessage(msg._id);
            return false;
          }
          return true;
        });
        
        if (messagesToCache.length > 0) {
          // Cache all messages from API (this ensures edited content is in cache)
          cacheMessages(messagesToCache);
          if (__DEV__) {
            console.log(`✅ Cached ${messagesToCache.length} messages (filtered ${normalizedData.length - messagesToCache.length} deleted)`);
            // Log edited messages for debugging
            const editedMessages = messagesToCache.filter(m => m.isEdited);
            if (editedMessages.length > 0) {
              console.log(`📝 Cached ${editedMessages.length} edited messages`);
            }
          }
        }
      }
      
      // 4. Replace messages with filtered API data (API is source of truth)
      // This ensures we always show the latest messages, including edited content
      setMessages(filteredData.sort((a, b) => 
        new Date(b.createdAt) - new Date(a.createdAt)
      ));
      
      setIsShowingCached(false); // Hide cache indicator when API data is loaded
      chatAnalytics.trackConversationLoaded(filteredData.length, false);
      setHasMore(filteredData.length >= 50);
      
      // Mark all as read if we have messages
      if (normalizedData.length > 0) {
        socketService.markAsRead(normalizedData[0].conversationId);
      }
    } catch (error) {
      if (__DEV__) {
        console.error('Load messages error:', error);
      }
      isFetchingRef.current = false;
      
      // Set error state with user-friendly message
      const errorMessage = error?.response?.data?.message || 
                          error?.message || 
                          'Failed to load messages. Please check your connection and try again.';
      setError({
        message: errorMessage,
        type: 'load',
        retry: loadMessages
      });
      
      // On error, keep cached messages visible if available
      // Show cache indicator if we're displaying cached data
      if (messages.length > 0) {
        setIsShowingCached(true);
      }
      
      // Track error retry
      chatAnalytics.trackErrorRetry('load_messages');
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
        
        // Filter out messages deleted for current user
        const filteredData = normalizedData.filter(msg => {
          // Don't show messages deleted for me
          if (msg.deletedFor?.includes(userData._id)) {
            // Delete from cache if it's deleted for me
            deleteCachedMessage(msg._id);
            return false;
          }
          return true;
        });
        
        chatAnalytics.trackMessageLoadMore(filteredData.length);
        
        // Cache only non-deleted messages
        const messagesToCache = normalizedData.filter(msg => {
          if (msg.deletedFor?.includes(userData._id)) {
            return false;
          }
          return true;
        });
        
        if (messagesToCache.length > 0) {
          cacheMessages(messagesToCache);
        }
        
        setMessages(prev => {
          // Filter out any messages that already exist in prev
          // Only add filtered (non-deleted) messages
          const newMessages = filteredData.reverse().filter(newMsg => 
            !prev.some(existingMsg => existingMsg._id === newMsg._id)
          );
          return [...prev, ...newMessages];
        });
        setHasMore(filteredData.length >= 50);
      } else {
        setHasMore(false);
      }
    } catch (error) {
      if (__DEV__) {
        console.error('Load more messages error:', error);
      }
      // Don't set error state for load more - just fail silently
      // User can retry by scrolling again
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
    let messageHandlerRef = null;
    let messageSentHandlerRef = null;
    let reconnectHandlerRef = null;

    const initSocket = async () => {
      await socketService.connect();
      
      if (!mounted) return;

      // Join chat room to notify other user
      socketService.joinChat(user._id);
      
      // Listen for socket reconnection
      reconnectHandlerRef = (attemptNumber) => {
        if (!mounted) return;
        if (__DEV__) {
          console.log(`🔄 Socket reconnected after ${attemptNumber} attempts, refreshing messages...`);
        }
        // Re-fetch messages on reconnect to ensure we have the latest
        loadMessages();
        chatAnalytics.trackSocketReconnection(attemptNumber, true);
      };
      
      // Listen to socket connection events
      const socket = socketService.socketInstance;
      if (socket) {
        socket.on('reconnect', reconnectHandlerRef);
      }
      
      if (__DEV__) {
        console.log('🔌 Socket initialized for chat with:', {
          otherUserId: user._id,
          currentUserId: userData._id,
          socketConnected: socketService.connected
        });
      }

      // Listen for new messages
      const messageHandler = (message) => {
        if (!mounted) return;
        
        // Normalize IDs to strings for comparison
        const senderId = message.senderId?._id || message.senderId;
        const receiverId = message.receiverId?._id || message.receiverId;
        const currentUserId = userData._id;
        const otherUserId = user._id;
        
        // Debug logging
        if (__DEV__) {
          console.log('📨 New message received:', {
            senderId: String(senderId),
            receiverId: String(receiverId),
            currentUserId: String(currentUserId),
            otherUserId: String(otherUserId),
            messageId: message._id,
            content: message.content?.substring(0, 50)
          });
        }
        
        // Check if message is for this conversation
        const isForThisConversation = (
          (String(senderId) === String(currentUserId) && String(receiverId) === String(otherUserId)) ||
          (String(senderId) === String(otherUserId) && String(receiverId) === String(currentUserId))
        );
        
        if (__DEV__) {
          console.log('🔍 Conversation check:', {
            isForThisConversation,
            senderMatchesCurrent: String(senderId) === String(currentUserId),
            senderMatchesOther: String(senderId) === String(otherUserId),
            receiverMatchesCurrent: String(receiverId) === String(currentUserId),
            receiverMatchesOther: String(receiverId) === String(otherUserId)
          });
        }
        
        if (isForThisConversation) {
          if (__DEV__) {
            console.log('✅ Message is for this conversation, adding to state');
          }
          // Normalize message content to ensure it's always a string
          const normalizedMessage = {
            ...message,
            content: normalizeContent(message.content)
          };
          
          // Don't process messages deleted for current user
          if (normalizedMessage.deletedFor?.includes(userData._id)) {
            if (__DEV__) {
              console.log('⏭️ Skipping message deleted for current user');
            }
            // Delete from cache if it exists
            deleteCachedMessage(normalizedMessage._id);
            return;
          }
          
          // Track message received
          chatAnalytics.trackMessageReceived(normalizedMessage.messageType || 'text');
          
          // Cache the message (only if not deleted for me)
          cacheMessage(normalizedMessage);
          
          setMessages((prev) => {
            if (!mounted) return prev;
            
            if (__DEV__) {
              console.log('📝 Current messages count:', prev.length);
              console.log('📝 New message ID:', normalizedMessage._id);
              console.log('📝 New message tempId:', normalizedMessage.tempId);
            }
            
            // Check for duplicates by _id first (most reliable)
            const existingById = prev.findIndex(m => m._id === normalizedMessage._id);
            
            if (existingById !== -1) {
              if (__DEV__) {
                console.log('🔄 Updating existing message by _id at index:', existingById);
              }
              // Update existing message - ensure content is normalized
              const newMessages = [...prev];
              const existingMsg = newMessages[existingById];
              newMessages[existingById] = { 
                ...existingMsg, 
                ...normalizedMessage,
                content: normalizeContent(normalizedMessage.content || existingMsg.content)
              };
              return newMessages;
            }
            
            // Check for duplicates by tempId (for optimistic updates)
            if (normalizedMessage.tempId) {
              const existingByTempId = prev.findIndex(m => m.tempId === normalizedMessage.tempId);
              if (existingByTempId !== -1) {
                if (__DEV__) {
                  console.log('🔄 Updating existing message by tempId at index:', existingByTempId);
                }
                // Update existing message with real _id
                const newMessages = [...prev];
                const existingMsg = newMessages[existingByTempId];
                newMessages[existingByTempId] = { 
                  ...normalizedMessage,
                  content: normalizeContent(normalizedMessage.content || existingMsg.content)
                };
                return newMessages;
              }
            }
            
            // Message is new, add it to the start (for inverted list)
            if (__DEV__) {
              console.log('✅ Adding new message to state');
            }
            
            // Ensure content is normalized one more time before adding to state
            const finalMessage = {
              ...normalizedMessage,
              content: normalizeContent(normalizedMessage.content)
            };
            return [finalMessage, ...prev];
          });
          
          // Acknowledge delivery if message is FROM the other user (we are the receiver)
          if (String(senderId) === String(otherUserId) && String(receiverId) === String(currentUserId)) {
            socketService.ackDelivered(message._id, String(senderId));
            socketService.markAsRead(message.conversationId || `${[currentUserId, otherUserId].sort().join('_')}`);
          }
        } else {
          if (__DEV__) {
            console.log('❌ Message filtered out - not for this conversation');
          }
        }
      };
      
      messageHandlerRef = messageHandler;
      socketService.onNewMessage(messageHandler);
      
      if (__DEV__) {
        console.log('✅ new_message listener attached');
        // Test: Add a direct listener to verify socket is receiving events
        setTimeout(() => {
          const socket = socketService.socketInstance;
          if (socket) {
            const testHandler = (msg) => {
              console.log('🔔 TEST: Raw new_message received:', {
                messageId: msg._id,
                senderId: msg.senderId?._id || msg.senderId,
                receiverId: msg.receiverId?._id || msg.receiverId,
                hasContent: !!msg.content
              });
            };
            socket.on('new_message', testHandler);
            // Remove test handler after 30 seconds
            setTimeout(() => {
              socket?.off('new_message', testHandler);
            }, 30000);
          }
        }, 1000);
      }

      // Listen for message sent confirmation (update temp ID)
      messageSentHandlerRef = (message) => {
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
      };
      
      socketService.onMessageSent(messageSentHandlerRef);

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
        
        // Delete from cache
        deleteCachedMessage(messageId);
        
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

      // Listen for edited messages
      socketService.onMessageEdited((data) => {
        if (!mounted) return;
        const { messageId, content, editedAt } = data;
        
        if (__DEV__) {
          console.log('📝 Message edited received:', { messageId, content: content?.substring(0, 50), editedAt });
        }
        
        // Generate conversation ID to check if this message belongs to current conversation
        const ids = [userData._id, user._id].sort();
        const conversationId = `${ids[0]}_${ids[1]}`;
        
        // Update message in local state
        setMessages(prev => {
          if (!mounted) return prev;
          const found = prev.find(msg => msg._id === messageId);
          if (__DEV__) {
            console.log('📝 Looking for message:', messageId, found ? 'Found' : 'Not found');
            if (found) {
              console.log('📝 Message conversationId:', found.conversationId, 'Current conversationId:', conversationId);
            }
          }
          
          return prev.map(msg => {
            if (msg._id === messageId) {
              // Verify this message belongs to the current conversation
              const msgConversationId = msg.conversationId || 
                (msg.senderId?._id && msg.receiverId ? 
                  [msg.senderId._id, msg.receiverId].sort().join('_') : 
                  null);
              
              if (msgConversationId && msgConversationId !== conversationId) {
                if (__DEV__) {
                  console.log('⏭️ Skipping edit - message not in current conversation');
                }
                return msg;
              }
              
              const updatedMessage = {
                ...msg,
                content: normalizeContent(content),
                editedAt: editedAt || new Date().toISOString(),
                isEdited: true,
              };
              // Update cache
              cacheMessage(updatedMessage);
              if (__DEV__) {
                console.log('✅ Message updated in state:', updatedMessage._id, updatedMessage.content?.substring(0, 50));
              }
              return updatedMessage;
            }
            return msg;
          });
        });
      });

      // Listen for message reactions
      socketService.onMessageReacted((data) => {
        if (!mounted) return;
        const { messageId, reactions } = data;
        
        if (__DEV__) {
          console.log('😊 Message reaction received:', { messageId, reactionsCount: reactions?.length });
        }
        
        // Generate conversation ID to check if this message belongs to current conversation
        const ids = [userData._id, user._id].sort();
        const conversationId = `${ids[0]}_${ids[1]}`;
        
        // Update message in local state
        setMessages(prev => {
          if (!mounted) return prev;
          
          return prev.map(msg => {
            if (msg._id === messageId) {
              // Verify this message belongs to the current conversation
              const msgConversationId = msg.conversationId || 
                (msg.senderId?._id && msg.receiverId ? 
                  [msg.senderId._id, msg.receiverId].sort().join('_') : 
                  null);
              
              if (msgConversationId && msgConversationId !== conversationId) {
                if (__DEV__) {
                  console.log('⏭️ Skipping reaction - message not in current conversation');
                }
                return msg;
              }
              
              const updatedMessage = {
                ...msg,
                reactions: reactions || [],
              };
              // Update cache
              cacheMessage(updatedMessage);
              if (__DEV__) {
                console.log('✅ Message reactions updated in state:', updatedMessage._id);
              }
              return updatedMessage;
            }
            return msg;
          });
        });
      });
    };

    loadMessages();
    initSocket();

    return () => {
      mounted = false;
      try {
        // Cleanup specific listeners by callback reference (prevents removing other listeners)
        if (messageHandlerRef) {
          socketService.removeListener('new_message', messageHandlerRef);
        }
        if (messageSentHandlerRef) {
          socketService.removeListener('message_sent', messageSentHandlerRef);
        }
        
        // Remove reconnect listener
        const socket = socketService.socketInstance;
        if (socket && reconnectHandlerRef) {
          socket.off('reconnect', reconnectHandlerRef);
        }
        
        // Leave chat room
        try {
          socketService.leaveChat(user._id);
        } catch (error) {
          if (__DEV__) {
            console.warn('Error leaving chat:', error);
          }
        }
        
        // NOTE: Do NOT disconnect socket here as it may interrupt other active screens/sessions
        // The socket service manages connection based on AppState and Auth
      } catch (error) {
        if (__DEV__) {
          console.warn('Error during cleanup:', error);
        }
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
    error,
    setError,
    isShowingCached,
  };
};

export default useMessages;
