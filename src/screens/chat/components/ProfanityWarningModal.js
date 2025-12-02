import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Image,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const ProfanityWarningModal = ({
  visible,
  messageText,
  userPhoto,
  userName,
  onKeepEditing,
  onSendAnyway,
}) => {
  const handleLearnMore = () => {
    // You can link to your terms of service or community guidelines
    Linking.openURL('https://example.com/community-guidelines').catch(err =>
      console.error('Error opening link:', err)
    );
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onKeepEditing}
    >
      <View style={styles.overlay}>
        <View style={styles.modalContainer}>
          {/* Message Preview with Warning */}
          <View style={styles.messagePreview}>
            <View style={styles.messageBubbleContainer}>
              <View style={styles.avatarContainer}>
                {userPhoto ? (
                  <Image source={{ uri: userPhoto }} style={styles.avatar} />
                ) : (
                  <View style={[styles.avatar, styles.avatarPlaceholder]}>
                    <Ionicons name="person" size={20} color="#999" />
                  </View>
                )}
              </View>
              <View style={styles.messageBubble}>
                <Text style={styles.messageText}>{messageText}</Text>
                <View style={styles.warningIcon}>
                  <Ionicons name="alert-circle" size={16} color="#FFF" />
                </View>
              </View>
            </View>
          </View>

          {/* Main Question */}
          <Text style={styles.mainQuestion}>
            Are you sure you want to send this?
          </Text>

          {/* Explanatory Text */}
          <Text style={styles.explanationText}>
            We noticed language that your match might find disrespectful.{' '}
            <Text style={styles.learnMoreLink} onPress={handleLearnMore}>
              Learn more
            </Text>
          </Text>

          {/* Action Buttons */}
          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={styles.keepEditingButton}
              onPress={onKeepEditing}
              activeOpacity={0.8}
            >
              <Text style={styles.keepEditingText}>Keep editing</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.sendAnywayButton}
              onPress={onSendAnyway}
              activeOpacity={0.8}
            >
              <Text style={styles.sendAnywayText}>Send anyway</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    width: '100%',
    maxWidth: 400,
    padding: 24,
    alignItems: 'center',
  },
  messagePreview: {
    width: '100%',
    marginBottom: 24,
  },
  messageBubbleContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
  },
  avatarContainer: {
    marginBottom: 4,
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F2F2F7',
  },
  avatarPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  messageBubble: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#000000',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 18,
    borderBottomLeftRadius: 4,
    gap: 8,
    maxWidth: '85%',
  },
  messageText: {
    flex: 1,
    fontSize: 15,
    color: '#FFFFFF',
    lineHeight: 20,
  },
  warningIcon: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#FF3B30',
    justifyContent: 'center',
    alignItems: 'center',
  },
  mainQuestion: {
    fontSize: 22,
    fontWeight: '700',
    color: '#000000',
    textAlign: 'center',
    marginBottom: 12,
    lineHeight: 28,
  },
  explanationText: {
    fontSize: 14,
    color: '#666666',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 32,
    paddingHorizontal: 8,
  },
  learnMoreLink: {
    color: '#007AFF',
    textDecorationLine: 'underline',
  },
  buttonContainer: {
    width: '100%',
    gap: 12,
  },
  keepEditingButton: {
    backgroundColor: '#000000',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  keepEditingText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  sendAnywayButton: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#000000',
  },
  sendAnywayText: {
    color: '#000000',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default ProfanityWarningModal;

