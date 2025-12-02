import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { normalizeContent } from '../../../utils/messageContent';
import styles from '../styles';
import socketService from '../../../services/socket';

const PinnedMessageBanner = ({ pinnedMessage, userData, scrollToMessage }) => {
  if (!pinnedMessage) return null;

  const canUnpin = pinnedMessage.pinnedBy && 
    (pinnedMessage.pinnedBy._id === userData._id || pinnedMessage.pinnedBy === userData._id);

  const handleUnpin = () => {
    socketService.pinMessage(pinnedMessage._id, pinnedMessage.conversationId, false);
  };

  const getMessagePreview = () => {
    if (pinnedMessage.messageType === 'audio') return '🎤 Voice message';
    if (pinnedMessage.messageType === 'image') return '📷 Photo';
    if (pinnedMessage.messageType === 'sticker') return '🎨 Sticker';
    return normalizeContent(pinnedMessage.content);
  };

  return (
    <View style={styles.pinnedMessageContainer}>
      <TouchableOpacity 
        style={styles.pinnedMessageContent}
        onPress={() => scrollToMessage && scrollToMessage(pinnedMessage._id)}
        activeOpacity={0.7}
      >
        <View style={styles.pinnedMessageIcon}>
          <Ionicons 
            name="pin" 
            size={10} 
            color="#8B6914" 
            style={styles.pinnedMessageIconInner}
          />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.pinnedMessageText} numberOfLines={1}>
            {getMessagePreview()}
          </Text>
        </View>
      </TouchableOpacity>
      {canUnpin && (
        <TouchableOpacity 
          onPress={handleUnpin}
          style={styles.pinnedMessageUnpinButton}
          activeOpacity={0.7}
        >
          <Ionicons name="close" size={14} color="#8B6914" />
        </TouchableOpacity>
      )}
    </View>
  );
};

export default PinnedMessageBanner;

