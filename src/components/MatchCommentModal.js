import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TextInput,
  TouchableOpacity,
  Image,
  KeyboardAvoidingView,
  Platform,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const MatchCommentModal = ({ visible, profile, onClose, onSend }) => {
  const [comment, setComment] = useState('');
  const [isSending, setIsSending] = useState(false);

  const handleSend = async () => {
    if (isSending) return;
    
    setIsSending(true);
    await onSend(profile, comment);
    setComment('');
    setIsSending(false);
    onClose();
  };

  const handleClose = () => {
    setComment('');
    onClose();
  };

  if (!profile) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleClose}
    >
      <View style={styles.overlay}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.container}
        >
          <View style={styles.modal}>
            {/* Header */}
            <View style={styles.header}>
              <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
                <Ionicons name="close" size={28} color="#000" />
              </TouchableOpacity>
            </View>

            {/* Profile Info */}
            <View style={styles.profileSection}>
              <Image source={{ uri: profile.photos?.[0] }} style={styles.profileImage} />
              <Text style={styles.name}>{profile.name}, {profile.age}</Text>
              <Text style={styles.subtitle}>Send a message with your match request</Text>
            </View>

            {/* Comment Input */}
            <View style={styles.inputSection}>
              <TextInput
                style={styles.input}
                placeholder="Say something nice... (optional)"
                placeholderTextColor="#999"
                value={comment}
                onChangeText={setComment}
                multiline
                maxLength={200}
                autoFocus
              />
              <Text style={styles.charCount}>{comment.length}/200</Text>
            </View>

            {/* Action Buttons */}
            <View style={styles.actions}>
              <TouchableOpacity
                style={styles.sendButton}
                onPress={handleSend}
                disabled={isSending}
              >
                <Ionicons name="heart" size={20} color="#D4AF37" style={{ marginRight: 8 }} />
                <Text style={styles.sendButtonText}>
                  {isSending ? 'Sending...' : 'Send Match Request'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    width: '100%',
    alignItems: 'center',
  },
  modal: {
    width: '90%',
    maxWidth: 400,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  header: {
    alignItems: 'flex-end',
    marginBottom: 8,
  },
  closeButton: {
    padding: 4,
  },
  profileSection: {
    alignItems: 'center',
    marginBottom: 24,
  },
  profileImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginBottom: 16,
    borderWidth: 3,
    borderColor: '#F5F5F5',
  },
  name: {
    fontSize: 24,
    fontWeight: '700',
    color: '#000',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  inputSection: {
    marginBottom: 24,
  },
  input: {
    backgroundColor: '#F9F9F9',
    borderRadius: 16,
    padding: 16,
    fontSize: 16,
    color: '#000',
    minHeight: 100,
    textAlignVertical: 'top',
    borderWidth: 1,
    borderColor: '#F2F2F7',
  },
  charCount: {
    fontSize: 12,
    color: '#999',
    textAlign: 'right',
    marginTop: 8,
  },
  actions: {
    gap: 12,
  },
  sendButton: {
    backgroundColor: '#000',
    paddingVertical: 16,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  sendButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700',
  },
});

export default MatchCommentModal;
