import React, { useEffect, useRef } from 'react';
import { Modal, View, Text, StyleSheet, TouchableOpacity, Dimensions, Animated, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import theme from '../theme/theme';

const { width, height } = Dimensions.get('window');

const NotificationBottomSheet = ({ 
  visible, 
  title, 
  message, 
  buttonText = "OK",
  onClose,
  onButtonPress, // Optional custom action
  secondaryButtonText,
  onSecondaryButtonPress,
  listItems, // Optional list of { icon, text }
  type = 'info', // 'success', 'error', 'info', 'match'
  centerList = false
}) => {
  const slideAnim = useRef(new Animated.Value(height)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(slideAnim, {
          toValue: 0,
          tension: 60,
          friction: 9,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.timing(slideAnim, {
        toValue: height,
        duration: 250,
        useNativeDriver: true,
      }).start();
      Animated.timing(opacityAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }
  }, [visible]);

  if (!visible) return null;

  const getIcon = () => {
      switch (type) {
          case 'success': return 'checkmark-circle';
          case 'error': return 'alert-circle';
          case 'match': return 'heart';
          default: return 'notifications';
      }
  };

  return (
    <Modal
      transparent
      visible={visible}
      animationType="none"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        {/* Backdrop Blur */}
        <BlurView intensity={40} tint="dark" style={StyleSheet.absoluteFill} />
        
        <TouchableOpacity 
           style={StyleSheet.absoluteFill} 
           activeOpacity={1} 
           onPress={onClose} 
        />
        
        <Animated.View
          style={[
            styles.sheetContainer,
            {
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
            {/* Handle Indicator */}
            <View style={styles.handleContainer}>
                <View style={styles.handle} />
            </View>

            <View style={styles.content}>
                {/* Icon */}
                <View style={styles.iconContainer}>
                    <Ionicons name={getIcon()} size={48} color="#D4AF37" />
                </View>

                {/* Text Content */}
                <Text style={styles.title}>{title}</Text>
                {listItems ? (
                  <View style={styles.listContainer}>
                    {listItems.map((item, index) => (
                      <View key={index} style={[styles.listItem, centerList && styles.listItemCentered]}>
                        <View style={[styles.listIconContainer, centerList && styles.listIconCentered]}>
                           <Ionicons name={item.icon} size={20} color="#D4AF37" />
                        </View>
                        <Text style={[styles.listItemText, centerList && styles.listItemTextCentered]}>{item.text}</Text>
                      </View>
                    ))}
                  </View>
                ) : (
                  <Text style={styles.message}>{message}</Text>
                )}

                {/* Primary Button */}
                <TouchableOpacity onPress={onButtonPress || onClose} style={styles.buttonContainer} activeOpacity={0.8}>
                    <LinearGradient
                        colors={['#D4AF37', '#F2D06B']} // Gold Gradient
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={styles.gradientButton}
                    >
                        <Text style={styles.buttonText}>{buttonText}</Text>
                    </LinearGradient>
                </TouchableOpacity>

                {/* Secondary Button */}
                {onSecondaryButtonPress && (
                  <TouchableOpacity 
                    onPress={onSecondaryButtonPress} 
                    style={styles.secondaryButton}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.secondaryButtonText}>{secondaryButtonText || "Cancel"}</Text>
                  </TouchableOpacity>
                )}
            </View>
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheetContainer: {
    backgroundColor: '#FFFFFF', // Pure White
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingHorizontal: 24,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
    paddingTop: 12,
    ...Platform.select({
      ios: {
        shadowColor: '#D4AF37', // Gold Shadow
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.15,
        shadowRadius: 12,
      },
      android: {
        elevation: 20,
      },
    }),
  },
  handleContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  handle: {
    width: 48,
    height: 5,
    borderRadius: 3,
    backgroundColor: '#E5E5E5',
  },
  content: {
    alignItems: 'center',
  },
  iconContainer: {
    marginBottom: 16,
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(212, 175, 55, 0.1)', // Light Gold Background
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333333', // Dark Gray
    marginBottom: 8,
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  message: {
    fontSize: 15,
    color: '#666666', // Mid Gray
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 32,
    paddingHorizontal: 16,
  },
  listContainer: {
    width: '100%',
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'flex-start', // Align to top for multi-line text
    marginBottom: 16,
  },
  listIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(212, 175, 55, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    marginTop: 2, // Align with first line of text
  },
  listItemText: {
    fontSize: 16,
    color: '#444444',
    fontWeight: '500',
    flex: 1, // Allow text to wrap
    lineHeight: 22,
  },
  listItemCentered: {
      flexDirection: 'column',
      alignItems: 'center',
      marginBottom: 24,
  },
  listIconCentered: {
      marginRight: 0,
      marginBottom: 8,
      marginTop: 0,
      width: 48,
      height: 48,
      borderRadius: 24,
  },
  listItemTextCentered: {
      textAlign: 'center',
      flex: 0,
      paddingHorizontal: 20,
  },
  buttonContainer: {
    width: '100%',
    borderRadius: 28,
    overflow: 'hidden',
    shadowColor: '#D4AF37',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  gradientButton: {
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    color: '#FFFFFF', // White text on gold button
    fontSize: 16,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  secondaryButton: {
    marginTop: 12,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryButtonText: {
    color: '#999',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default NotificationBottomSheet;
