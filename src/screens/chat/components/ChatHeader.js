import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, TextInput } from 'react-native';
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
  isOnline,
  searchQuery,
  onSearchChange,
  isSearchMode,
  onSearchToggle
}) => {
  if (isSearchMode) {
    return (
      <View style={styles.header}>
        <TouchableOpacity 
          onPress={() => {
            onSearchToggle(false);
            onSearchChange('');
          }}
          style={styles.backButton}
        >
          <Ionicons name="chevron-back" size={28} color="#000" />
        </TouchableOpacity>
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color="#999" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search messages..."
            placeholderTextColor="#999"
            value={searchQuery}
            onChangeText={onSearchChange}
            autoFocus
            accessible={true}
            accessibilityLabel="Search messages"
            accessibilityHint="Type to search for messages in this conversation"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity 
              onPress={() => onSearchChange('')}
              style={styles.clearButton}
            >
              <Ionicons name="close-circle" size={20} color="#999" />
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  }

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
        accessible={true}
        accessibilityLabel="Go back"
        accessibilityHint="Navigate back to previous screen"
        accessibilityRole="button"
      >
        <Ionicons name="chevron-back" size={28} color="#000" />
      </TouchableOpacity>
      <TouchableOpacity 
        onPress={() => navigation.navigate('ViewUserProfile', { userId: user._id, user })}
        accessible={true}
        accessibilityLabel={`View ${user.displayName || user.name}'s profile`}
        accessibilityHint="Tap to view user profile"
        accessibilityRole="button"
      >
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
      
      <TouchableOpacity 
        onPress={() => onSearchToggle(true)}
        style={styles.searchButton}
        accessible={true}
        accessibilityLabel="Search messages"
        accessibilityHint="Tap to search for messages in this conversation"
        accessibilityRole="button"
      >
        <Ionicons name="search" size={24} color="#000" />
      </TouchableOpacity>
      
      {/* Call Buttons - HIDDEN FOR PRODUCTION */}
      {false && (
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
      )}
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
  searchButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    borderRadius: 20,
    paddingHorizontal: 12,
    marginRight: 8,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#000',
    paddingVertical: 8,
  },
  clearButton: {
    marginLeft: 8,
    padding: 4,
  },
});

export default ChatHeader;
