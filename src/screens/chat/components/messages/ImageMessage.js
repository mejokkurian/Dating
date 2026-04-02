import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const ImageMessage = ({ imageUrl, isViewOnce, viewed, isMine, onPress, onLongPress }) => {
  const [imageLoading, setImageLoading] = useState(true);
  const [imageError, setImageError] = useState(false);
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
      {imageError ? (
        <View style={[styles.messageImage, styles.errorContainer]}>
          <Ionicons name="image-outline" size={40} color={isMine ? '#FFFFFF' : '#666666'} />
          <Text style={[styles.errorText, isMine ? styles.myMessageText : styles.theirMessageText]}>
            Failed to load image
          </Text>
        </View>
      ) : (
        <>
          {imageLoading && (
            <View style={[styles.messageImage, styles.loadingOverlay]}>
              <ActivityIndicator size="small" color={isMine ? '#FFFFFF' : '#D4AF37'} />
            </View>
          )}
          <Image 
            source={{ uri: imageUrl }} 
            style={styles.messageImage} 
            resizeMode="cover"
            onLoadStart={() => setImageLoading(true)}
            onLoadEnd={() => setImageLoading(false)}
            onError={() => {
              setImageLoading(false);
              setImageError(true);
            }}
          />
        </>
      )}
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
  loadingOverlay: {
    position: 'absolute',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  errorContainer: {
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    fontSize: 12,
    marginTop: 8,
    textAlign: 'center',
  },
});

export default ImageMessage;
