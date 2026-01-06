import { useState, useCallback } from 'react';
import { Alert } from 'react-native';
import socketService from '../../../services/socket';

const useMessageActions = (userData) => {
  const [selectedMessage, setSelectedMessage] = useState(null);
  const [showActionSheet, setShowActionSheet] = useState(false);
  const [replyToMessage, setReplyToMessage] = useState(null);

  const handleLongPress = useCallback((message) => {
    console.log('handleLongPress triggered for message:', message._id, message.messageType);
    
    // Don't show actions for deleted messages or view once images
    const isDeletedForEveryone = message.deletedForEveryone;
    const isDeletedForMe = message.deletedFor?.includes(userData._id);
    
    if (isDeletedForEveryone || isDeletedForMe) {
      console.log('Message is deleted, ignoring long press');
      return;
    }
    
    if (message.isViewOnce && message.messageType === 'image') {
      console.log('Message is view once, ignoring long press');
      return;
    }
    
    console.log('Setting selected message and showing sheet');
    setSelectedMessage(message);
    setShowActionSheet(true);
  }, [userData._id]);

  const handleReply = () => {
    console.log('handleReply triggered', selectedMessage?._id);
    if (!selectedMessage) return;
    setReplyToMessage(selectedMessage);
    setShowActionSheet(false);
  };

  const handlePin = () => {
    console.log('handlePin triggered', selectedMessage?._id);
    if (!selectedMessage) return;
    
    // Toggle pin status
    const newPinStatus = !selectedMessage.isPinned;
    socketService.pinMessage(selectedMessage._id, selectedMessage.conversationId, newPinStatus);
    setShowActionSheet(false);
  };

  const handleStar = () => {
    console.log('handleStar triggered', selectedMessage?._id);
    if (!selectedMessage) return;
    
    // Toggle star status
    const isCurrentlyStarred = selectedMessage.starredBy?.includes(userData._id);
    const newStarStatus = !isCurrentlyStarred;
    socketService.starMessage(selectedMessage._id, newStarStatus);
    setShowActionSheet(false);
  };

  const handleDelete = (deleteForEveryone = false) => {
    console.log('handleDelete triggered', selectedMessage?._id, deleteForEveryone);
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

  return {
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
  };
};

export default useMessageActions;
