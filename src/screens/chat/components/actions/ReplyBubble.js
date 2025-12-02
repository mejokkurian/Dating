import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { normalizeContent } from '../../../../utils/messageContent';

const ReplyBubble = ({ replyTo, isMine, userData, user, onPress }) => {
  if (!replyTo) return null;

  const senderName = replyTo.senderId?._id === userData._id 
    ? 'You' 
    : (replyTo.senderId?.displayName || user.name);

  return (
    <TouchableOpacity 
      style={[
        styles.replyContext, 
        isMine ? styles.replyContextMine : styles.replyContextTheirs
      ]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={[
        styles.replyBorder, 
        { backgroundColor: isMine ? 'rgba(255,255,255,0.5)' : '#007AFF' }
      ]} />
      <View style={styles.replyContentWrapper}>
        <Text 
          style={[
            styles.replySenderName, 
            { color: isMine ? 'rgba(255,255,255,0.9)' : '#007AFF' }
          ]}
          numberOfLines={1}
          ellipsizeMode="tail"
        >
          {senderName}
        </Text>
        {replyTo.messageType === 'audio' ? (
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
        ) : replyTo.messageType === 'sticker' ? (
          <Text style={[
            styles.replyMessageText, 
            { color: isMine ? 'rgba(255,255,255,0.7)' : '#666' }
          ]}>
            🎨 Sticker
          </Text>
        ) : replyTo.messageType === 'image' ? (
          <View style={styles.replyAudioPreview}>
            <Ionicons 
              name="image" 
              size={12} 
              color={isMine ? 'rgba(255,255,255,0.7)' : '#666'} 
            />
            <Text style={[
              styles.replyMessageText, 
              { color: isMine ? 'rgba(255,255,255,0.7)' : '#666' }
            ]}>
              Photo
            </Text>
          </View>
        ) : (
          <Text 
            style={[
              styles.replyMessageText, 
              { color: isMine ? 'rgba(255,255,255,0.7)' : '#666' }
            ]} 
            numberOfLines={3}
            ellipsizeMode="tail"
          >
            {normalizeContent(replyTo.content)}
          </Text>
        )}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  replyContext: {
    flexDirection: 'row',
    marginBottom: 8,
    borderRadius: 8,
    padding: 8,
    maxWidth: '100%',
  },
  replyContextMine: {
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  replyContextTheirs: {
    backgroundColor: 'rgba(0,122,255,0.1)',
  },
  replyBorder: {
    width: 3,
    borderRadius: 1.5,
    marginRight: 8,
  },
  replyContentWrapper: {
    flex: 1,
    justifyContent: 'center',
  },
  replySenderName: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 2,
  },
  replyMessageText: {
    fontSize: 12,
  },
  replyAudioPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
});

export default ReplyBubble;
