import React from 'react';
import { View, Text, TouchableOpacity, TouchableWithoutFeedback } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { normalizeContent } from '../../../utils/messageContent';
import styles from '../styles';

const MessageActionSheet = ({
  visible,
  onClose,
  selectedMessage,
  userData,
  onReply,
  onPin,
  onStar,
  onDelete,
}) => {
  if (!visible || !selectedMessage) return null;

  // Don't show actions for deleted messages or view once images
  const isDeletedForEveryone = selectedMessage.deletedForEveryone;
  const isDeletedForMe = selectedMessage.deletedFor?.includes(userData._id);
  const isViewOnceImage = selectedMessage.isViewOnce && selectedMessage.messageType === 'image';
  
  if (isDeletedForEveryone || isDeletedForMe || isViewOnceImage) {
    return null;
  }

  const isMine = selectedMessage.senderId._id === userData._id;

  // Format time helper
  const formatTime = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <View style={styles.actionSheetOverlay}>
      <TouchableWithoutFeedback onPress={onClose}>
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
              {normalizeContent(selectedMessage.content)}
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
            onPress={() => {
              console.log('Direct Reply Pressed');
              onReply();
            }}
            activeOpacity={0.7}
          >
            <Text style={styles.whatsappActionText}>Reply</Text>
            <Ionicons name="arrow-undo-outline" size={22} color="#007AFF" />
          </TouchableOpacity>

          {/* Pin - Available for all messages */}
          <TouchableOpacity 
            style={styles.whatsappActionItem} 
            onPress={() => {
              console.log('Direct Pin Pressed');
              onPin();
            }}
            activeOpacity={0.7}
          >
            <Text style={styles.whatsappActionText}>
              {selectedMessage.isPinned ? 'Unpin' : 'Pin'}
            </Text>
            <Ionicons 
              name={selectedMessage.isPinned ? "pin" : "pin-outline"} 
              size={22} 
              color="#007AFF" 
            />
          </TouchableOpacity>

          {/* Star - Available for all messages */}
          <TouchableOpacity 
            style={styles.whatsappActionItem} 
            onPress={() => {
              console.log('Direct Star Pressed');
              onStar();
            }}
            activeOpacity={0.7}
          >
            <Text style={styles.whatsappActionText}>
              {selectedMessage.starredBy?.includes(userData._id) ? 'Unstar' : 'Star'}
            </Text>
            <Ionicons 
              name={selectedMessage.starredBy?.includes(userData._id) ? "star" : "star-outline"} 
              size={22} 
              color="#FFC107" 
            />
          </TouchableOpacity>

          {/* Delete - Only for my messages */}
          {isMine && (
            <TouchableOpacity 
              style={[styles.whatsappActionItem, styles.lastActionItem]} 
              onPress={() => {
                console.log('Direct Delete Pressed');
                onDelete();
              }}
              activeOpacity={0.7}
            >
              <Text style={[styles.whatsappActionText, { color: '#FF3B30' }]}>Delete</Text>
              <Ionicons name="trash-outline" size={22} color="#FF3B30" />
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  );
};

export default MessageActionSheet;
