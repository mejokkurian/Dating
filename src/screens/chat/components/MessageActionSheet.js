import React from 'react';
import { View, Text, TouchableOpacity, TouchableWithoutFeedback } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { normalizeContent } from '../../../utils/messageContent';
import createChatStyles from '../styles';
import { useTheme } from '../../../context/ThemeContext';

const MessageActionSheet = ({
  visible,
  onClose,
  selectedMessage,
  userData,
  onReply,
  onPin,
  onStar,
  onEdit,
  onForward,
  onDelete,
  onReaction,
  isActionLoading = false,
}) => {
  const { colors } = useTheme();
  const styles = createChatStyles(colors);
  if (!visible || !selectedMessage) return null;

  // Don't show actions for deleted messages or view once images
  const isDeletedForEveryone = selectedMessage.deletedForEveryone;
  const isDeletedForMe = selectedMessage.deletedFor?.includes(userData._id);
  const isViewOnceImage = selectedMessage.isViewOnce && selectedMessage.messageType === 'image';
  
  if (isDeletedForEveryone || isDeletedForMe || isViewOnceImage) {
    return null;
  }

  const isMine = selectedMessage.senderId._id === userData._id;
  const isTextMessage = selectedMessage.messageType === 'text' || !selectedMessage.messageType;
  const isRecent = (Date.now() - new Date(selectedMessage.createdAt).getTime()) < 15 * 60 * 1000; // 15 minutes
  const canEdit = isMine && isTextMessage && isRecent && !selectedMessage.isEdited;

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
        {/* Emoji Reactions Bar - Only show for received messages (not sent by current user) */}
        {!isMine && (
          <View style={styles.emojiBar}>
            {['👍', '❤️', '😂', '😮', '😢', '🙏', '👏'].map((emoji) => {
              const hasReaction = selectedMessage.reactions?.some(r => {
                const rUserId = r.userId?._id || r.userId;
                return String(rUserId) === String(userData._id) && r.emoji === emoji;
              });
              return (
                <TouchableOpacity
                  key={emoji}
                  style={[
                    styles.emojiButton,
                    hasReaction && styles.emojiButtonActive,
                    isActionLoading && { opacity: 0.5 }
                  ]}
                  onPress={() => {
                    if (!isActionLoading && onReaction) {
                      onReaction(emoji);
                    }
                  }}
                  disabled={isActionLoading}
                  activeOpacity={0.7}
                >
                  <Text style={styles.emojiText}>{emoji}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        )}

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
            style={[styles.whatsappActionItem, isActionLoading && { opacity: 0.5 }]} 
            onPress={() => {
              if (__DEV__) {
                console.log('Direct Reply Pressed');
              }
              if (!isActionLoading) {
                onReply();
              }
            }}
            activeOpacity={0.7}
            disabled={isActionLoading}
          >
            <Text style={styles.whatsappActionText}>Reply</Text>
            <Ionicons name="arrow-undo-outline" size={22} color="#007AFF" />
          </TouchableOpacity>

          {/* Pin - Available for all messages */}
          <TouchableOpacity 
            style={[styles.whatsappActionItem, isActionLoading && { opacity: 0.5 }]} 
            onPress={() => {
              if (__DEV__) {
                console.log('Direct Pin Pressed');
              }
              if (!isActionLoading) {
                onPin();
              }
            }}
            activeOpacity={0.7}
            disabled={isActionLoading}
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
            style={[styles.whatsappActionItem, isActionLoading && { opacity: 0.5 }]} 
            onPress={() => {
              if (__DEV__) {
                console.log('Direct Star Pressed');
              }
              if (!isActionLoading) {
                onStar();
              }
            }}
            activeOpacity={0.7}
            disabled={isActionLoading}
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

          {/* Edit - Only for my text messages, within 15 minutes, not already edited */}
          {canEdit && (
            <TouchableOpacity 
              style={[styles.whatsappActionItem, isActionLoading && { opacity: 0.5 }]} 
              onPress={() => {
                if (__DEV__) {
                  console.log('Direct Edit Pressed');
                }
                if (!isActionLoading) {
                  onEdit();
                }
              }}
              activeOpacity={0.7}
              disabled={isActionLoading}
            >
              <Text style={styles.whatsappActionText}>Edit</Text>
              <Ionicons name="create-outline" size={22} color="#007AFF" />
            </TouchableOpacity>
          )}

          {/* Forward - Available for all messages */}
          <TouchableOpacity 
            style={[styles.whatsappActionItem, isActionLoading && { opacity: 0.5 }]} 
            onPress={() => {
              if (__DEV__) {
                console.log('Direct Forward Pressed');
              }
              if (!isActionLoading) {
                onForward();
              }
            }}
            activeOpacity={0.7}
            disabled={isActionLoading}
          >
            <Text style={styles.whatsappActionText}>Forward</Text>
            <Ionicons name="arrow-forward-outline" size={22} color="#007AFF" />
          </TouchableOpacity>

          {/* Delete - Only for my messages */}
          {isMine && (
            <TouchableOpacity 
              style={[styles.whatsappActionItem, styles.lastActionItem, isActionLoading && { opacity: 0.5 }]} 
              onPress={() => {
                if (__DEV__) {
                  console.log('Direct Delete Pressed');
                }
                if (!isActionLoading) {
                  onDelete();
                }
              }}
              activeOpacity={0.7}
              disabled={isActionLoading}
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
