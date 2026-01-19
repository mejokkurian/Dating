import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import BottomSheet from './BottomSheet';

const MatchSuccessBottomSheet = ({ visible, onClose, user, onSendMessage, onKeepBrowsing }) => {
  const userPhoto = user?.photos?.[user?.mainPhotoIndex ?? 0] || user?.photos?.[0] || 'https://via.placeholder.com/100';
  const userName = user?.displayName || user?.name || 'Someone';

  return (
    <BottomSheet visible={visible} onClose={onClose} height="auto">
      <View style={styles.container}>
        {/* Celebration Icon */}
        <View style={styles.iconContainer}>
          <View style={styles.heartCircle}>
            <Ionicons name="heart" size={40} color="#D4AF37" />
          </View>
        </View>

        {/* Title */}
        <Text style={styles.title}>It's a Match!</Text>
        
        {/* User Photo */}
        <Image source={{ uri: userPhoto }} style={styles.userPhoto} />
        
        {/* Message */}
        <Text style={styles.message}>
          You and <Text style={styles.userName}>{userName}</Text> liked each other!
        </Text>

        {/* Buttons */}
        <TouchableOpacity 
          style={styles.primaryButton}
          onPress={onSendMessage}
          activeOpacity={0.8}
        >
          <Ionicons name="chatbubble" size={20} color="#FFF" style={styles.buttonIcon} />
          <Text style={styles.primaryButtonText}>Send Message</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.secondaryButton}
          onPress={onKeepBrowsing}
          activeOpacity={0.8}
        >
          <Text style={styles.secondaryButtonText}>Keep Browsing</Text>
        </TouchableOpacity>
      </View>
    </BottomSheet>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 20,
    alignItems: 'center',
  },
  iconContainer: {
    marginBottom: 12,
  },
  heartCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#FFF9E6',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#D4AF37',
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: '#000',
    marginBottom: 12,
  },
  userPhoto: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginBottom: 12,
    borderWidth: 3,
    borderColor: '#D4AF37',
  },
  message: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 22,
  },
  userName: {
    fontWeight: '700',
    color: '#000',
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#D4AF37',
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 12,
    width: '100%',
    marginBottom: 10,
    shadowColor: '#D4AF37',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  buttonIcon: {
    marginRight: 8,
  },
  primaryButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700',
  },
  secondaryButton: {
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 12,
    width: '100%',
    borderWidth: 2,
    borderColor: '#E0E0E0',
    backgroundColor: '#FFF',
  },
  secondaryButtonText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
});

export default MatchSuccessBottomSheet;
