import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import theme from '../theme/theme';
import BottomSheet from './BottomSheet';
import { sanitizeAndValidateMessage } from '../utils/inputSanitization';

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
  loading = false,
  rateLimitInfo = { allowed: true, remaining: 5 },
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
      // Reset state when modal closes (only if not loading)
      if (!loading) {
        setSelectedMessage('');
        setCustomMessage('');
      }
    }
  }, [visible, loading]);

  const handleSend = () => {
    if (loading || !rateLimitInfo.allowed) return; // Prevent sending while already in progress or rate limited
    
    // Use selected message or custom message
    const rawMessage = customMessage.trim() || selectedMessage;
    
    if (!rawMessage || !user) return;
    
    // Sanitize and validate the message
    const result = sanitizeAndValidateMessage(rawMessage, 200);
    
    if (!result.valid) {
      // If validation fails, don't send (could show error to user)
      console.warn('Message validation failed:', result.error);
      return;
    }
    
    // Send sanitized message
    onSend(user, result.sanitized);
    // Don't close modal here - let parent handle it after success
    // Don't reset state here - parent will handle cleanup
  };
  
  const canSend = rateLimitInfo.allowed && (selectedMessage || customMessage.trim()) && !loading;

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      height={650} // Set a fixed comfortable height or use percentage
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <View style={styles.headerInfo}>
            <Text style={styles.title}>Say Hello</Text>
            {user && (
              <Text style={styles.subtitle}>
                to {user.displayName || user.name || 'this user'}
              </Text>
            )}
          </View>
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
                  loading && styles.quickMessageButtonDisabled,
                ]}
                onPress={() => {
                  if (!loading) {
                    setSelectedMessage(message);
                    setCustomMessage('');
                  }
                }}
                disabled={loading}
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
              if (!loading) {
                setCustomMessage(text);
                setSelectedMessage('');
              }
            }}
            multiline
            maxLength={200}
            editable={!loading}
          />
          {customMessage.length > 0 && (
            <Text style={styles.charCount}>
              {customMessage.length}/200
            </Text>
          )}
          
          {/* Rate limit indicator */}
          {rateLimitInfo.remaining !== undefined && rateLimitInfo.remaining < 3 && (
            <View style={styles.rateLimitContainer}>
              <Ionicons 
                name={rateLimitInfo.allowed ? "information-circle-outline" : "warning-outline"} 
                size={16} 
                color={rateLimitInfo.allowed ? "#FFA500" : "#FF3B30"} 
              />
              <Text style={[
                styles.rateLimitText,
                !rateLimitInfo.allowed && styles.rateLimitTextError
              ]}>
                {rateLimitInfo.allowed 
                  ? `${rateLimitInfo.remaining} quick hello${rateLimitInfo.remaining !== 1 ? 's' : ''} remaining this minute`
                  : `Rate limit reached. Please wait before sending another.`
                }
              </Text>
            </View>
          )}
        </ScrollView>

        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.button, styles.cancelButton]}
            onPress={onClose}
            disabled={loading}
          >
            <Text style={[styles.cancelButtonText, loading && styles.disabledText]}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.button,
              styles.sendButton,
              !canSend && styles.sendButtonDisabled,
            ]}
            onPress={handleSend}
            disabled={!canSend}
          >
            {loading ? (
              <>
                <ActivityIndicator size="small" color="#fff" style={{ marginRight: 8 }} />
                <Text style={styles.sendButtonText}>Sending...</Text>
              </>
            ) : (
              <>
                <Ionicons name="send" size={18} color="#fff" />
                <Text style={styles.sendButtonText}>Send</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </BottomSheet>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 24,
    paddingBottom: 20,
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
  quickMessageButtonDisabled: {
    opacity: 0.5,
  },
  disabledText: {
    opacity: 0.5,
  },
  rateLimitContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#FFF9E6',
    borderWidth: 1,
    borderColor: '#FFE066',
  },
  rateLimitText: {
    fontSize: 13,
    color: '#FFA500',
    marginLeft: 8,
    flex: 1,
  },
  rateLimitTextError: {
    color: '#FF3B30',
  },
});

export default QuickHelloModal;

