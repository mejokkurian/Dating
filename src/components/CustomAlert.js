import React, { useEffect, useRef } from 'react';
import { Modal, View, Text, StyleSheet, TouchableOpacity, Dimensions, Animated, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import theme from '../theme/theme';

const { width } = Dimensions.get('window');

const CustomAlert = ({ 
  visible, 
  title, 
  message, 
  buttons = [],
  onClose,
  onConfirm,
  type = 'default', // 'success', 'error', 'warning', 'default'
}) => {
  const scaleAnim = useRef(new Animated.Value(0.3)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const iconScaleAnim = useRef(new Animated.Value(0)).current;
  const heartPumpAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (visible) {
      // Initial entrance animations
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 50,
          friction: 7,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.spring(slideAnim, {
          toValue: 0,
          tension: 50,
          friction: 8,
          useNativeDriver: true,
        }),
        Animated.sequence([
          Animated.delay(100),
          Animated.spring(iconScaleAnim, {
            toValue: 1,
            tension: 50,
            friction: 6,
            useNativeDriver: true,
          }),
        ]),
      ]).start(() => {
        // Start continuous pumping animation after entrance
        if (title?.includes('Match')) {
          Animated.loop(
            Animated.sequence([
              Animated.timing(heartPumpAnim, {
                toValue: 1.15,
                duration: 500,
                useNativeDriver: true,
              }),
              Animated.timing(heartPumpAnim, {
                toValue: 1,
                duration: 500,
                useNativeDriver: true,
              }),
            ])
          ).start();
        }
      });
    } else {
      scaleAnim.setValue(0.3);
      opacityAnim.setValue(0);
      slideAnim.setValue(50);
      iconScaleAnim.setValue(0);
      heartPumpAnim.setValue(1);
    }
  }, [visible, title]);

  if (!visible) return null;

  const alertButtons = buttons.length > 0 ? buttons : (
    onConfirm ? [
      { text: 'Cancel', style: 'cancel', onPress: onClose },
      { text: 'Confirm', onPress: onConfirm }
    ] : [
      { text: 'OK', onPress: onClose }
    ]
  );

  const getIconConfig = () => {
    // Check type prop first
    if (type === 'error') {
      return { name: 'close-circle', color: '#FFFFFF', gradient: ['#333333', '#000000'], size: 44 };
    }
    if (type === 'warning') {
      return { name: 'alert-circle', color: '#FFFFFF', gradient: ['#FF9800', '#F57C00'], size: 44 };
    }
    if (type === 'success') {
      return { name: 'checkmark-circle', color: '#FFFFFF', gradient: ['#11998e', '#38ef7d'], size: 42 };
    }
    
    // Fallback to title-based detection for backward compatibility
    if (title?.includes('Match')) {
      return { name: 'heart', color: '#FFFFFF', gradient: ['#D4AF37', '#F2D06B'], size: 42 };
    }
    if (title?.includes('Super Like') || title?.includes('⭐')) {
      return { name: 'star', color: '#FFFFFF', gradient: ['#FFD700', '#FFA500'], size: 42 };
    }
    if (title?.includes('Error')) {
      return { name: 'close-circle', color: '#FFFFFF', gradient: ['#333333', '#000000'], size: 44 };
    }
    if (title?.includes('Propose') || title?.includes('☕') || title?.includes('🍷')) {
      return { name: 'cafe', color: '#FFFFFF', gradient: ['#F2994A', '#F2C94C'], size: 40 };
    }
    return { name: 'checkmark-circle', color: '#FFFFFF', gradient: ['#11998e', '#38ef7d'], size: 42 };
  };

  const iconConfig = getIconConfig();

  return (
    <Modal
      transparent
      visible={visible}
      animationType="none"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <BlurView intensity={30} style={StyleSheet.absoluteFill} tint="dark" />
        
        <TouchableOpacity
          style={styles.backdrop}
          activeOpacity={1}
          onPress={onClose}
        />
        
        <Animated.View
          style={[
            styles.alertContainer,
            {
              opacity: opacityAnim,
              transform: [
                { scale: scaleAnim },
                { translateY: slideAnim }
              ],
            },
          ]}
        >
          {/* Gradient Background */}
          <LinearGradient
            colors={theme.colors.gradients.background}
            style={styles.gradientBackground}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            {/* Icon Bubble */}
            <View style={styles.iconWrapper}>
               <Animated.View
                style={[
                  styles.iconCircle,
                  {
                    transform: [
                      { 
                        scale: Animated.multiply(iconScaleAnim, heartPumpAnim)
                      }
                    ],
                  },
                ]}
              >
                <LinearGradient
                  colors={iconConfig.gradient}
                  style={styles.iconGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <Ionicons name={iconConfig.name} size={iconConfig.size} color={iconConfig.color} />
                </LinearGradient>
              </Animated.View>
            </View>
            
            {/* Text Content */}
            <View style={styles.contentContainer}>
              {title && (
                <Text style={styles.title}>{title}</Text>
              )}
              
              {message && (
                <Text style={styles.message}>{message}</Text>
              )}
            </View>
            
            {/* Buttons */}
            <View style={styles.buttonContainer}>
              {alertButtons.map((button, index) => {
                const isCancel = button.style === 'cancel';
                const isPrimary = !isCancel; 
                
                return (
                  <TouchableOpacity
                    key={index}
                    style={[styles.button, { flex: 1 }]}
                    onPress={() => {
                      button.onPress?.();
                      onClose?.();
                    }}
                    activeOpacity={0.8}
                  >
                    {isPrimary ? (
                      <LinearGradient
                        colors={theme.colors.gradients.primary}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={styles.primaryButtonGradient}
                      >
                        <Text style={styles.primaryButtonText}>
                          {button.text}
                        </Text>
                      </LinearGradient>
                    ) : (
                      <View style={styles.secondaryButton}>
                        <Text style={styles.secondaryButtonText}>
                          {button.text}
                        </Text>
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          </LinearGradient>
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
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  alertContainer: {
    width: width * 0.82,
    maxWidth: 360,
    borderRadius: theme.borderRadius.xl,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.25,
        shadowRadius: 20,
      },
      android: {
        elevation: 10,
      },
    }),
  },
  gradientBackground: {
    paddingTop: 32,
    paddingBottom: 24,
    paddingHorizontal: 24,
    alignItems: 'center',
    backgroundColor: theme.colors.background,
  },
  iconWrapper: {
    marginBottom: 20,
    ...Platform.select({
        ios: {
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 8 },
          shadowOpacity: 0.15,
          shadowRadius: 12,
        },
        android: {
          elevation: 8,
        },
      }),
  },
  iconCircle: {
    width: 84,
    height: 84,
    borderRadius: 42,
    overflow: 'hidden',
    borderWidth: 4,
    borderColor: '#FFFFFF',
  },
  iconGradient: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  contentContainer: {
    alignItems: 'center',
    marginBottom: 28,
  },
  title: {
    fontSize: theme.typography.fontSize['2xl'],
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.text.primary,
    textAlign: 'center',
    marginBottom: 10,
    letterSpacing: -0.5,
  },
  message: {
    fontSize: theme.typography.fontSize.base,
    color: theme.colors.text.secondary,
    textAlign: 'center',
    lineHeight: 22,
    opacity: 0.9,
    paddingHorizontal: 4,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12, // Gap between buttons
    width: '100%',
    justifyContent: 'space-between',
  },
  button: {
    height: 52,
    borderRadius: theme.borderRadius.full,
    overflow: 'hidden',
  },
  primaryButtonGradient: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonText: {
    color: theme.colors.text.inverse,
    fontSize: theme.typography.fontSize.base,
    fontWeight: theme.typography.fontWeight.bold,
    letterSpacing: 0.5,
  },
  secondaryButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.surfaceDark,
    borderRadius: theme.borderRadius.full,
    borderWidth: 1,
    borderColor: 'transparent', // Looks cleaner without border or very subtle one
  },
  secondaryButtonText: {
    color: theme.colors.text.secondary,
    fontSize: theme.typography.fontSize.base,
    fontWeight: theme.typography.fontWeight.semiBold,
  },
});

export default CustomAlert;
