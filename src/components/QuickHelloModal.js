import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import theme from '../theme/theme';
import GlassCard from './GlassCard';

const QUICK_MESSAGES = [
  'Hey! 👋',
  'Hi there!',
  'Hello! Nice to see you nearby',
  'Hey, want to chat?',
  'Hi! I noticed you\'re nearby',
];

const QuickHelloModal = ({
  visible,
  onClose,
  onSend,
  user,
}) => {
  const [selectedMessage, setSelectedMessage] = useState('');
  const [customMessage, setCustomMessage] = useState('');

  // Reset state and auto-select first message when modal opens/closes
  useEffect(() => {
    if (visible) {
      // Auto-select first message when modal opens so Send button is enabled immediately
      setSelectedMessage(QUICK_MESSAGES[0]);
      setCustomMessage('');
    } else {
      // Reset state when modal closes
      setSelectedMessage('');
      setCustomMessage('');
    }
  }, [visible]);

  const handleSend = () => {
    const message = customMessage.trim() || selectedMessage;
    if (message) {
      onSend(user, message);
      setSelectedMessage('');
      setCustomMessage('');
      onClose();
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <GlassCard style={styles.modalContent}>
          <View style={styles.header}>
            <View style={styles.headerInfo}>
              <Text style={styles.title}>Say Hello</Text>
              {user && (
                <Text style={styles.subtitle}>
                  to {user.displayName || user.name || 'this user'}
                </Text>
              )}
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color="#000" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            <Text style={styles.sectionTitle}>Quick Messages</Text>
            <View style={styles.quickMessagesContainer}>
              {QUICK_MESSAGES.map((message, index) => (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.quickMessageButton,
                    selectedMessage === message && styles.quickMessageButtonSelected,
                  ]}
                  onPress={() => {
                    setSelectedMessage(message);
                    setCustomMessage('');
                  }}
                >
                  <Text
                    style={[
                      styles.quickMessageText,
                      selectedMessage === message && styles.quickMessageTextSelected,
                    ]}
                  >
                    {message}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={[styles.sectionTitle, { marginTop: 24 }]}>Or Write Your Own</Text>
            <TextInput
              style={styles.customInput}
              placeholder="Type your message..."
              placeholderTextColor="#999"
              value={customMessage}
              onChangeText={(text) => {
                setCustomMessage(text);
                setSelectedMessage('');
              }}
              multiline
              maxLength={200}
            />
            {customMessage.length > 0 && (
              <Text style={styles.charCount}>
                {customMessage.length}/200
              </Text>
            )}
          </ScrollView>

          <View style={styles.footer}>
            <TouchableOpacity
              style={[styles.button, styles.cancelButton]}
              onPress={onClose}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.button,
                styles.sendButton,
                (!selectedMessage && !customMessage.trim()) && styles.sendButtonDisabled,
              ]}
              onPress={handleSend}
              disabled={!selectedMessage && !customMessage.trim()}
            >
              <Ionicons name="send" size={18} color="#fff" />
              <Text style={styles.sendButtonText}>Send</Text>
            </TouchableOpacity>
          </View>
        </GlassCard>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    maxHeight: '80%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  headerInfo: {
    flex: 1,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#000',
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  closeButton: {
    padding: 4,
  },
  content: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 12,
  },
  quickMessagesContainer: {
    gap: 8,
  },
  quickMessageButton: {
    padding: 14,
    borderRadius: 12,
    backgroundColor: '#f5f5f5',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  quickMessageButtonSelected: {
    backgroundColor: theme.colors.primary + '20',
    borderColor: theme.colors.primary,
  },
  quickMessageText: {
    fontSize: 15,
    color: '#000',
  },
  quickMessageTextSelected: {
    color: theme.colors.primary,
    fontWeight: '600',
  },
  customInput: {
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    padding: 16,
    fontSize: 15,
    color: '#000',
    minHeight: 100,
    textAlignVertical: 'top',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  charCount: {
    fontSize: 12,
    color: '#999',
    textAlign: 'right',
    marginTop: 4,
  },
  footer: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
  },
  button: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  cancelButton: {
    backgroundColor: '#f0f0f0',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  sendButton: {
    backgroundColor: theme.colors.primary,
  },
  sendButtonDisabled: {
    backgroundColor: '#ccc',
    opacity: 0.6,
  },
  sendButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});

export default QuickHelloModal;

