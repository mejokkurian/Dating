import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const ImageMessage = ({ imageUrl, isViewOnce, viewed, isMine, onPress, onLongPress }) => {
  if (isViewOnce) {
    if (viewed) {
      return (
        <TouchableOpacity 
          activeOpacity={0.9}
          onPress={onPress}
          style={styles.viewOnceMessage}
        >
          <Ionicons name="checkmark-circle" size={20} color={isMine ? '#FFF' : '#666'} />
          <Text style={[styles.viewOnceLabelSmall, isMine ? styles.myMessageText : styles.theirMessageText]}>
            Opened
          </Text>
        </TouchableOpacity>
      );
    } else {
      return (
        <TouchableOpacity 
          activeOpacity={0.9}
          onPress={onPress}
          style={styles.viewOnceMessage}
        >
          <View style={[styles.viewOnceIconSmall, !isMine && styles.viewOnceIconSmallTheirs]}>
            <Text style={[styles.viewOnceTextSmall, !isMine && styles.viewOnceTextSmallTheirs]}>1</Text>
          </View>
          <Text style={[styles.viewOnceLabelSmall, isMine ? styles.myMessageText : styles.theirMessageText]}>
            Photo
          </Text>
        </TouchableOpacity>
      );
    }
  }

  return (
    <TouchableOpacity 
      activeOpacity={0.9}
      onPress={onPress}
      onLongPress={onLongPress}
      style={styles.imageMessageContainer}
    >
      <Image 
        source={{ uri: imageUrl }} 
        style={styles.messageImage} 
        resizeMode="cover"
      />
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  imageMessageContainer: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  messageImage: {
    width: 200,
    height: 200,
    borderRadius: 12,
  },
  viewOnceMessage: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    padding: 1,
    minWidth: 100,
  },
  viewOnceIconSmall: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#FFF',
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
  },
  viewOnceTextSmall: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFF',
  },
  viewOnceIconSmallTheirs: {
    borderColor: '#666',
  },
  viewOnceTextSmallTheirs: {
    color: '#666',
  },
  viewOnceLabelSmall: {
    fontSize: 14,
    fontWeight: '500',
  },
  myMessageText: {
    color: '#FFF',
  },
  theirMessageText: {
    color: '#000',
  },
});

export default ImageMessage;
