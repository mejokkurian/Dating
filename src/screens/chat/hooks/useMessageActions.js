import { useState, useCallback } from 'react';
import { Alert } from 'react-native';
import socketService from '../../../services/socket';
import * as chatAnalytics from '../../../services/chatAnalytics';
import { deleteCachedMessage, cacheMessage } from '../../../services/MessageCache';
import { normalizeContent } from '../../../utils/messageContent';

const useMessageActions = (userData, setMessages) => {
  const [selectedMessage, setSelectedMessage] = useState(null);
  const [showActionSheet, setShowActionSheet] = useState(false);
  const [replyToMessage, setReplyToMessage] = useState(null);
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [editingMessage, setEditingMessage] = useState(null);
  const [forwardingMessage, setForwardingMessage] = useState(null);
  const [showForwardModal, setShowForwardModal] = useState(false);

  const handleReaction = async (emoji) => {
    if (!selectedMessage || isActionLoading) return;

    // Only allow reactions on received messages (not sent by current user)
    const isMine = selectedMessage.senderId?._id === userData._id || 
                   String(selectedMessage.senderId?._id) === String(userData._id);
    if (isMine) {
      if (__DEV__) {
        console.warn('Cannot react to own message');
      }
      return;
    }

    // Check if user already reacted with this emoji
    const existingReaction = selectedMessage.reactions?.find(r => {
      const rUserId = r.userId?._id || r.userId;
      return String(rUserId) === String(userData._id) && r.emoji === emoji;
    });

    setIsActionLoading(true);
    try {
      // If user already has this reaction, remove it; otherwise add it
      const emojiToSend = existingReaction ? null : emoji;
      socketService.reactToMessage(selectedMessage._id, emojiToSend);
      
      chatAnalytics.trackMessageAction('react', selectedMessage.messageType);
      setShowActionSheet(false);
    } catch (error) {
      if (__DEV__) {
        console.error('Error reacting to message:', error);
      }
      chatAnalytics.trackMessageActionFailed('react', error);
      Alert.alert(
        'Error',
        error?.response?.data?.message || error?.message || 'Failed to react to message. Please try again.'
      );
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleLongPress = useCallback((message) => {
    if (__DEV__) {
      console.log('handleLongPress triggered for message:', message._id, message.messageType);
    }
    
    // Don't show actions for deleted messages or view once images
    const isDeletedForEveryone = message.deletedForEveryone;
    const isDeletedForMe = message.deletedFor?.includes(userData._id);
    
    if (isDeletedForEveryone || isDeletedForMe) {
      if (__DEV__) {
        console.log('Message is deleted, ignoring long press');
      }
      return;
    }
    
    if (message.isViewOnce && message.messageType === 'image') {
      if (__DEV__) {
        console.log('Message is view once, ignoring long press');
      }
      return;
    }
    
    if (__DEV__) {
      console.log('Setting selected message and showing sheet');
    }
    setSelectedMessage(message);
    setShowActionSheet(true);
  }, [userData._id]);

  const handleReply = () => {
    if (__DEV__) {
      console.log('handleReply triggered', selectedMessage?._id);
    }
    if (!selectedMessage) return;
    chatAnalytics.trackMessageAction('reply', selectedMessage.messageType);
    setReplyToMessage(selectedMessage);
    setShowActionSheet(false);
  };

  const handlePin = async () => {
    if (__DEV__) {
      console.log('handlePin triggered', selectedMessage?._id);
    }
    if (!selectedMessage || isActionLoading) return;
    
    setIsActionLoading(true);
    try {
      // Toggle pin status
      const newPinStatus = !selectedMessage.isPinned;
      await socketService.pinMessage(selectedMessage._id, selectedMessage.conversationId, newPinStatus);
      chatAnalytics.trackMessageAction('pin', selectedMessage.messageType);
      setShowActionSheet(false);
    } catch (error) {
      if (__DEV__) {
        console.error('Error pinning message:', error);
      }
      chatAnalytics.trackMessageActionFailed('pin', error);
      Alert.alert(
        'Error',
        error?.response?.data?.message || error?.message || 'Failed to pin message. Please try again.'
      );
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleStar = async () => {
    if (__DEV__) {
      console.log('handleStar triggered', selectedMessage?._id);
    }
    if (!selectedMessage || isActionLoading) return;
    
    setIsActionLoading(true);
    try {
      // Toggle star status
      const isCurrentlyStarred = selectedMessage.starredBy?.includes(userData._id);
      const newStarStatus = !isCurrentlyStarred;
      await socketService.starMessage(selectedMessage._id, newStarStatus);
      chatAnalytics.trackMessageAction('star', selectedMessage.messageType);
      setShowActionSheet(false);
    } catch (error) {
      if (__DEV__) {
        console.error('Error starring message:', error);
      }
      chatAnalytics.trackMessageActionFailed('star', error);
      Alert.alert(
        'Error',
        error?.response?.data?.message || error?.message || 'Failed to star message. Please try again.'
      );
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleEdit = async (newContent) => {
    if (__DEV__) {
      console.log('handleEdit triggered', editingMessage?._id, newContent);
    }
    if (!editingMessage || isActionLoading || !newContent || newContent.trim() === '') return;

    const trimmedContent = newContent.trim();
    if (trimmedContent === editingMessage.content) {
      // No change, just cancel
      setEditingMessage(null);
      setShowActionSheet(false);
      return;
    }

    setIsActionLoading(true);
    
    // Optimistically update the message in UI immediately
    if (setMessages) {
      setMessages(prev => {
        return prev.map(msg => {
          if (msg._id === editingMessage._id) {
            return {
              ...msg,
              content: normalizeContent(trimmedContent),
              editedAt: new Date().toISOString(),
              isEdited: true,
            };
          }
          return msg;
        });
      });
    }
    
    try {
      await socketService.editMessage(editingMessage._id, trimmedContent);
      
      // Update cache with edited content
      const updatedMessage = {
        ...editingMessage,
        content: normalizeContent(trimmedContent),
        editedAt: new Date().toISOString(),
        isEdited: true,
      };
      cacheMessage(updatedMessage);
      
      chatAnalytics.trackMessageAction('edit', editingMessage.messageType);
      setEditingMessage(null);
      setShowActionSheet(false);
    } catch (error) {
      if (__DEV__) {
        console.error('Error editing message:', error);
      }
      
      // Revert optimistic update on error
      if (setMessages) {
        setMessages(prev => {
          return prev.map(msg => {
            if (msg._id === editingMessage._id) {
              return editingMessage; // Revert to original
            }
            return msg;
          });
        });
      }
      
      chatAnalytics.trackMessageActionFailed('edit', error);
      Alert.alert(
        'Error',
        error?.response?.data?.message || error?.message || 'Failed to edit message. Please try again.'
      );
    } finally {
      setIsActionLoading(false);
    }
  };

  const startEdit = () => {
    if (!selectedMessage) return;
    setEditingMessage(selectedMessage);
    setShowActionSheet(false);
  };

  const cancelEdit = () => {
    setEditingMessage(null);
  };

  const startForward = () => {
    if (!selectedMessage) return;
    setForwardingMessage(selectedMessage);
    setShowForwardModal(true);
    setShowActionSheet(false);
  };

  const cancelForward = () => {
    setForwardingMessage(null);
    setShowForwardModal(false);
  };

  const handleForward = async (conversation) => {
    if (!forwardingMessage || !conversation || !conversation.user) return;

    setIsActionLoading(true);
    try {
      const receiverId = conversation.user._id;
      let content = '';
      let messageType = forwardingMessage.messageType || 'text';
      let fileUrl = null;
      let duration = null;
      let metadata = {};

      // Prepare message content based on type
      if (messageType === 'text') {
        content = forwardingMessage.content || '';
        // Add forward indicator
        content = `Forwarded: ${content}`;
      } else if (messageType === 'audio') {
        content = 'Forwarded voice message';
        fileUrl = forwardingMessage.audioUrl;
        duration = forwardingMessage.audioDuration;
      } else if (messageType === 'image') {
        content = forwardingMessage.content || 'Forwarded photo';
        fileUrl = forwardingMessage.imageUrl;
        metadata.isViewOnce = forwardingMessage.isViewOnce || false;
      } else if (messageType === 'sticker') {
        content = 'Forwarded sticker';
        metadata.stickerEmoji = forwardingMessage.stickerEmoji;
        metadata.stickerId = forwardingMessage.stickerId;
      } else if (messageType === 'file') {
        content = forwardingMessage.fileName || 'Forwarded file';
        fileUrl = forwardingMessage.fileUrl;
        metadata.fileName = forwardingMessage.fileName;
        metadata.fileSize = forwardingMessage.fileSize;
      }

      // Generate temp ID for optimistic update
      const tempId = `forward_${Date.now()}_${Math.random()}`;

      // Send the forwarded message
      socketService.sendMessage(
        receiverId,
        content,
        tempId,
        messageType,
        fileUrl,
        duration,
        null, // No replyTo for forwarded messages
        metadata
      );

      chatAnalytics.trackMessageAction('forward', forwardingMessage.messageType);
      setForwardingMessage(null);
      setShowForwardModal(false);
    } catch (error) {
      if (__DEV__) {
        console.error('Error forwarding message:', error);
      }
      chatAnalytics.trackMessageActionFailed('forward', error);
      Alert.alert(
        'Error',
        error?.response?.data?.message || error?.message || 'Failed to forward message. Please try again.'
      );
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleDelete = async (deleteForEveryone = false) => {
    if (__DEV__) {
      console.log('handleDelete triggered', selectedMessage?._id, deleteForEveryone);
    }
    if (!selectedMessage || isActionLoading) return;

    setIsActionLoading(true);
    try {
      await socketService.deleteMessage(selectedMessage._id, deleteForEveryone);
      
      // Delete from cache immediately
      deleteCachedMessage(selectedMessage._id);
      
      chatAnalytics.trackMessageAction('delete', selectedMessage.messageType);
      setShowActionSheet(false);
    } catch (error) {
      if (__DEV__) {
        console.error('Error deleting message:', error);
      }
      chatAnalytics.trackMessageActionFailed('delete', error);
      Alert.alert(
        'Error',
        error?.response?.data?.message || error?.message || 'Failed to delete message. Please try again.'
      );
    } finally {
      setIsActionLoading(false);
    }
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

  return {
    selectedMessage,
    setSelectedMessage,
    showActionSheet,
    setShowActionSheet,
    replyToMessage,
    setReplyToMessage,
    editingMessage,
    setEditingMessage,
    forwardingMessage,
    showForwardModal,
    setShowForwardModal,
    handleLongPress,
    handleReply,
    handlePin,
    handleStar,
    handleEdit,
    startEdit,
    cancelEdit,
    startForward,
    cancelForward,
    handleForward,
    handleReaction,
    handleDelete,
    confirmDelete,
    isActionLoading,
  };
};

export default useMessageActions;
