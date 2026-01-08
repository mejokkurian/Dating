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
  KeyboardAvoidingView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import theme from '../theme/theme';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

const SuperLikeModal = ({ visible, profile, onClose, onSend }) => {
  const [comment, setComment] = useState('');
  const [isSending, setIsSending] = useState(false);
  
  // Animation: Slide Up from Bottom
  const slideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;

  useEffect(() => {
    if (visible) {
      // Reset position to bottom before sliding up
      slideAnim.setValue(SCREEN_HEIGHT);
      
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 60,
        friction: 9,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(slideAnim, {
        toValue: SCREEN_HEIGHT,
        duration: 200,
        useNativeDriver: true,
      }).start();
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
    Animated.timing(slideAnim, {
      toValue: SCREEN_HEIGHT,
      duration: 250,
      useNativeDriver: true,
    }).start(() => {
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
      animationType="none" // We handle animation manually
      onRequestClose={handleClose}
      statusBarTranslucent={true}
    >
      <View style={styles.overlay}>
        {/* Backdrop - Tap to close */}
        <TouchableOpacity 
          style={styles.backdrop} 
          activeOpacity={1} 
          onPress={handleClose} 
        >
             <View style={styles.backdropLayer} />
        </TouchableOpacity>

        {/* Sliding Sheet */}
        <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={styles.keyboardAvoidingView}
        >
            <Animated.View 
            style={[
                styles.bottomSheet,
                {
                   transform: [{ translateY: slideAnim }],
                },
            ]}
            >
            <View style={styles.handleContainer}>
                <View style={styles.handle} />
            </View>

            <View style={styles.content}>
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
                            colors={['#D4AF37', '#F2C94C']}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                            style={styles.gradientButton}
                        >
                            {isSending ? (
                                <Text style={styles.sendButtonText}>Sending...</Text>
                            ) : (
                                <>
                                    <Text style={styles.sendButtonText}>Send</Text>
                                    <Ionicons name="heart" size={18} color="#FFF" style={{ marginLeft: 6 }} />
                                </>
                            )}
                        </LinearGradient>
                    </TouchableOpacity>
                </View>
            </View>
            </Animated.View>
        </KeyboardAvoidingView>

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
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  backdropLayer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  keyboardAvoidingView: {
    width: '100%',
    justifyContent: 'flex-end',
  },
  bottomSheet: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingBottom: Platform.OS === 'ios' ? 40 : 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -5 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 20,
  },
  handleContainer: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  handle: {
    width: 40,
    height: 5,
    backgroundColor: '#E5E5EA',
    borderRadius: 3,
  },
  content: {
    paddingHorizontal: 24,
    paddingBottom: 20,
    alignItems: 'center',
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
    borderColor: '#D4AF37',
  },
  badgeIcon: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#D4AF37',
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
