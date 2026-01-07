import React, { useEffect, useRef } from 'react';
import { Modal, View, Text, StyleSheet, TouchableOpacity, Dimensions, Animated, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import theme from '../theme/theme';

const { width } = Dimensions.get('window');

const DateConfirmationModal = ({ 
  visible, 
  onClose, 
  onConfirm, 
  dateOption,
  profileName 
}) => {
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 60,
          friction: 8,
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

  if (!visible || !dateOption) return null;

  return (
    <Modal
      transparent
      visible={visible}
      animationType="none"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        {/* Dark Heavy Blur Background */}
        <BlurView intensity={80} tint="dark" style={StyleSheet.absoluteFill} />
        
        <TouchableOpacity
          style={StyleSheet.absoluteFill}
          activeOpacity={1}
          onPress={onClose}
        />
        
        <Animated.View
          style={[
            styles.modalCard,
            {
              opacity: opacityAnim,
              transform: [{ scale: scaleAnim }],
            },
          ]}
        >
          {/* Main Content */}
          <View style={styles.content}>
             {/* Floating Gold Icon */}
             <View style={styles.iconContainer}>
                <Ionicons 
                    name={dateOption.icon} 
                    size={48} 
                    color="#D4AF37" 
                    style={styles.iconShadow}
                />
             </View>

             <Text style={styles.title}>
               Propose {dateOption.label}
             </Text>

             <Text style={styles.message}>
               Send "{dateOption.message}" to{"\n"}
               <Text style={styles.highlight}>{profileName || "this user"}</Text>
               <Text>?</Text>
             </Text>
             
             {/* Action Buttons */}
             <View style={styles.buttonContainer}>
                <TouchableOpacity onPress={onClose} style={styles.cancelButton}>
                   <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity onPress={onConfirm} style={styles.confirmButton}>
                   <LinearGradient
                      colors={['#D4AF37', '#F2D06B']} // Gold Gradient
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={styles.gradientButton}
                   >
                      <Text style={styles.confirmButtonText}>Send Request</Text>
                   </LinearGradient>
                </TouchableOpacity>
             </View>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.4)', // Fallback for Android
  },
  modalCard: {
    width: width * 0.8,
    maxWidth: 340,
    backgroundColor: '#FFFFFF', // White background
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(212, 175, 55, 0.3)', // Subtle Gold Border
    padding: 24,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.15, // Lighter shadow for light mode
        shadowRadius: 20,
      },
      android: {
        elevation: 10,
      },
    }),
  },
  content: {
    alignItems: 'center',
  },
  iconContainer: {
    marginBottom: 20,
  },
  iconShadow: {
    textShadowColor: 'rgba(212, 175, 55, 0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#000000', // Black text
    marginBottom: 12,
    letterSpacing: 0.5,
  },
  message: {
    fontSize: 16,
    color: 'rgba(0,0,0,0.7)', // Dark grey text
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 28,
  },
  highlight: {
    color: '#D4AF37', // Keep Gold
    fontWeight: '600',
  },
  buttonContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButtonText: {
    color: 'rgba(0,0,0,0.5)', // Medium grey for cancel
    fontSize: 15,
    fontWeight: '600',
  },
  confirmButton: {
    flex: 1.5,
    borderRadius: 30,
    overflow: 'hidden',
    shadowColor: '#D4AF37',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  gradientButton: {
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmButtonText: {
    color: '#1a1a1a', // Dark text on gold
    fontSize: 15,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
});

export default DateConfirmationModal;
