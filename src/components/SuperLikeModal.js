import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TextInput,
  TouchableOpacity,
  Image,
  Platform,
  Keyboard,
  InputAccessoryView,
  Animated,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import theme from '../theme/theme';

const SuperLikeModal = ({ visible, profile, onClose, onSend }) => {
  const [comment, setComment] = useState('');
  const [isSending, setIsSending] = useState(false);
  
  // Animation values
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 50,
          friction: 7,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      scaleAnim.setValue(0.8);
      opacityAnim.setValue(0);
    }
  }, [visible]);

  const handleSend = async () => {
    if (isSending) return;
    
    setIsSending(true);
    await onSend(profile, comment);
    setComment('');
    setIsSending(false);
    handleClose();
  };

  const handleClose = () => {
    Keyboard.dismiss();
    Animated.parallel([
      Animated.timing(scaleAnim, {
        toValue: 0.8,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setComment('');
      onClose();
    });
  };

  if (!profile) return null;

  const inputAccessoryViewID = 'superLikeInputAccessory';

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={handleClose}
      statusBarTranslucent={true}
    >
      <View style={styles.centeredOverlay}>
        {/* Dark Backdrop */}
        <TouchableOpacity 
          style={StyleSheet.absoluteFill} 
          activeOpacity={1} 
          onPress={handleClose} 
        >
             <View style={styles.backdropLayer} />
        </TouchableOpacity>

        {/* Modal Card content */}
        <Animated.View 
          style={[
            styles.modalContent,
            {
              opacity: opacityAnim,
              transform: [{ scale: scaleAnim }],
            },
          ]}
        >
          <View style={styles.cardInternal}>
              {/* Header */}
              <View style={styles.header}>
                  <Ionicons name="star" size={24} color="#D4AF37" />
                  <Text style={styles.headerTitle}>Super Like</Text>
              </View>

              {/* Profile Info */}
              <View style={styles.profileSection}>
                  <View style={styles.imageWrapper}>
                      <Image 
                      source={{ 
                          uri: profile.photos && profile.photos.length > 0
                          ? (profile.photos[profile.mainPhotoIndex ?? 0] || profile.photos[0])
                          : null
                      }} 
                      style={styles.profileImage} 
                      />
                      <View style={styles.badgeIcon}>
                          <Ionicons name="star" size={14} color="#FFF" />
                      </View>
                  </View>
                  <Text style={styles.profileName}>
                      {profile.name || profile.displayName}, {profile.age}
                  </Text>
                  <Text style={styles.profileSubtext}>
                      Send a message...
                  </Text>
              </View>

              {/* Input */}
              <View style={styles.inputContainer}>
                  <TextInput
                      style={styles.input}
                      placeholder="Send a message..."
                      placeholderTextColor="#999"
                      value={comment}
                      onChangeText={setComment}
                      multiline
                      maxLength={140}
                      returnKeyType="done"
                      blurOnSubmit={true}
                      inputAccessoryViewID={Platform.OS === 'ios' ? inputAccessoryViewID : undefined}
                  />
              </View>

              {/* Buttons */}
              <View style={styles.buttonRow}>
                  <TouchableOpacity 
                      style={styles.cancelButton} 
                      onPress={handleClose}
                  >
                      <Text style={styles.cancelButtonText}>Cancel</Text>
                  </TouchableOpacity>

                  <TouchableOpacity 
                      style={styles.sendButton} 
                      onPress={handleSend}
                      disabled={isSending}
                  >
                      <LinearGradient
                          colors={['#FFD700', '#FFA500']}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 1 }}
                          style={styles.gradientButton}
                      >
                          {isSending ? (
                              <Text style={styles.sendButtonText}>Sending...</Text>
                          ) : (
                              <>
                                  <Text style={styles.sendButtonText}>Send</Text>
                                  <Ionicons name="paper-plane" size={16} color="#FFF" style={{ marginLeft: 6 }} />
                              </>
                          )}
                      </LinearGradient>
                  </TouchableOpacity>
              </View>
          </View>
        </Animated.View>

        {/* iOS Accessory */}
        {Platform.OS === 'ios' && (
          <InputAccessoryView nativeID={inputAccessoryViewID}>
            <View style={styles.keyboardAccessory}>
              <TouchableOpacity onPress={() => Keyboard.dismiss()}>
                <Text style={styles.doneButtonText}>Done</Text>
              </TouchableOpacity>
            </View>
          </InputAccessoryView>
        )}
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  centeredOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  backdropLayer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
  },
  modalContent: {
    width: '90%',
    maxWidth: 340,
    alignItems: 'center',
  },
  cardInternal: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 28,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 20,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#D4AF37',
    letterSpacing: -0.5,
  },
  profileSection: {
    alignItems: 'center',
    marginBottom: 20,
  },
  imageWrapper: {
    position: 'relative',
    marginBottom: 12,
  },
  profileImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 3,
    borderColor: '#FFD700',
  },
  badgeIcon: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#FFD700',
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFF',
  },
  profileName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000',
    marginBottom: 4,
  },
  profileSubtext: {
    fontSize: 14,
    color: '#666',
  },
  inputContainer: {
    width: '100%',
    backgroundColor: '#F5F5F5',
    borderRadius: 16,
    padding: 12,
    marginBottom: 20,
    height: 100,
  },
  input: {
    fontSize: 15,
    color: '#000',
    textAlignVertical: 'top',
    height: '100%',
  },
  buttonRow: {
    flexDirection: 'row',
    width: '100%',
    gap: 12,
    height: 56, // Fixed height to avoid stretching
  },
  cancelButton: {
    flex: 1,
    height: '100%', 
    borderRadius: 25,
    backgroundColor: '#F0F0F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButtonText: {
    color: '#666',
    fontWeight: '600',
    fontSize: 15,
  },
  sendButton: {
    flex: 1.5,
    height: '100%', // Match row height
    borderRadius: 25,
    elevation: 4,
    overflow: 'hidden',
  },
  gradientButton: {
    width: '100%',
    height: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonText: {
    color: '#FFF',
    fontWeight: '700',
    fontSize: 15,
  },
  keyboardAccessory: {
    backgroundColor: '#F9F9F9',
    borderTopWidth: 1,
    borderTopColor: '#E5E5EA',
    paddingHorizontal: 16,
    paddingVertical: 8,
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  doneButtonText: {
    fontWeight: '600',
    color: '#007AFF',
  },
});

export default SuperLikeModal;
