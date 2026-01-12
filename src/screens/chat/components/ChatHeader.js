import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const ChatHeader = ({ 
  user, 
  navigation, 
  isTyping, 
  isRemoteRecording, 
  isOtherUserInChat,
  onAudioCall,
  onVideoCall,
  callState,
  isOnline
}) => {
  return (
    <View style={styles.header}>
      <TouchableOpacity 
        onPress={() => {
          if (navigation.canGoBack()) {
            navigation.goBack();
          } else {
            // If we cant go back (e.g. came from replace), default to the Messages tab
            // We use reset/navigate to ensure we land on the main tabs structure
            navigation.navigate('MainTab', { screen: 'Messages' });
          }
        }} 
        style={styles.backButton}
      >
        <Ionicons name="chevron-back" size={28} color="#000" />
      </TouchableOpacity>
      <TouchableOpacity onPress={() => navigation.navigate('ViewUserProfile', { userId: user._id, user })}>
        <Image 
          source={{ 
            uri: user.image || (user.photos && user.photos.length > 0 ? (user.photos[user.mainPhotoIndex || 0] || user.photos[0]) : 'https://via.placeholder.com/40' ) 
          }} 
          style={styles.avatar} 
        />
      </TouchableOpacity>
      <View style={styles.headerInfo}>
        <Text style={styles.headerName}>{user.displayName || user.name || 'User'}</Text>
        <Text style={[styles.statusText, !isOnline && { color: '#999' }]}>
          {!isOnline ? 'Offline' : isRemoteRecording ? 'Recording audio...' : isTyping ? 'Typing...' : isOtherUserInChat ? 'In Chat' : 'Online'}
        </Text>
      </View>
      
      {/* Call Buttons */}
      <View style={styles.callButtons}>
        <TouchableOpacity 
          onPress={onAudioCall}
          style={[styles.callButton, callState.visible && { opacity: 0.5 }]}
          disabled={callState.visible}
        >
          <Ionicons name="call" size={28} color="#000" />
        </TouchableOpacity>
        <TouchableOpacity 
          onPress={onVideoCall}
          style={[styles.callButton, callState.visible && { opacity: 0.5 }]}
          disabled={callState.visible}
        >
          <Ionicons name="videocam" size={28} color="#000" />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F2F2F7',
  },
  backButton: {
    marginRight: 16,
    padding: 4,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  headerInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  headerName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#000',
  },
  statusText: {
    fontSize: 12,
    color: '#4CAF50',
  },
  callButtons: {
    flexDirection: 'row',
    gap: 16,
    alignItems: 'center',
  },
  callButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default ChatHeader;
