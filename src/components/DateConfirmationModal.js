import React, { useEffect, useRef } from 'react';
import { Modal, View, Text, StyleSheet, TouchableOpacity, Dimensions, Animated, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

const DateConfirmationModal = ({
  visible,
  onClose,
  onConfirm,
  dateOption,
  profileName
}) => {
  const scaleAnim = useRef(new Animated.Value(0.85)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const shimmerAnim = useRef(new Animated.Value(0)).current;
  const glowAnim = useRef(new Animated.Value(0.6)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 65,
          friction: 7,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 220,
          useNativeDriver: true,
        }),
      ]).start();

      // Shimmer loop
      Animated.loop(
        Animated.sequence([
          Animated.timing(shimmerAnim, { toValue: 1, duration: 1800, useNativeDriver: true }),
          Animated.timing(shimmerAnim, { toValue: 0, duration: 1800, useNativeDriver: true }),
        ])
      ).start();

      // Glow pulse loop
      Animated.loop(
        Animated.sequence([
          Animated.timing(glowAnim, { toValue: 1, duration: 1200, useNativeDriver: true }),
          Animated.timing(glowAnim, { toValue: 0.5, duration: 1200, useNativeDriver: true }),
        ])
      ).start();
    } else {
      scaleAnim.setValue(0.85);
      opacityAnim.setValue(0);
      shimmerAnim.setValue(0);
      glowAnim.setValue(0.6);
    }
  }, [visible]);

  if (!visible || !dateOption) return null;

  const shimmerTranslate = shimmerAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-180, 180],
  });

  return (
    <Modal
      transparent
      visible={visible}
      animationType="none"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <BlurView intensity={90} tint="dark" style={StyleSheet.absoluteFill} />

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
          {/* Card background gradient */}
          <LinearGradient
            colors={['#1C1608', '#0F0C08', '#171207']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
            borderRadius={28}
          />

          {/* Gold border shimmer overlay */}
          <View style={[StyleSheet.absoluteFill, styles.borderOverlay]} pointerEvents="none">
            <Animated.View
              style={[
                styles.shimmerLine,
                { transform: [{ translateX: shimmerTranslate }] },
              ]}
            />
          </View>

          <View style={styles.content}>
            {/* Glow circle behind icon */}
            <View style={styles.iconWrapper}>
              <Animated.View style={[styles.glowCircle, { opacity: glowAnim }]} />
              <LinearGradient
                colors={['#2C2008', '#1A1406']}
                style={styles.iconBg}
                borderRadius={40}
              >
                <Ionicons
                  name={dateOption.icon}
                  size={42}
                  color="#D4AF37"
                />
              </LinearGradient>
            </View>

            {/* Gold divider dots */}
            <View style={styles.dotRow}>
              <View style={[styles.dot, { opacity: 0.3 }]} />
              <View style={[styles.dot, { opacity: 0.7 }]} />
              <View style={[styles.dot, { opacity: 1 }]} />
              <View style={[styles.dot, { opacity: 0.7 }]} />
              <View style={[styles.dot, { opacity: 0.3 }]} />
            </View>

            <Text style={styles.title}>Propose {dateOption.label}</Text>

            <Text style={styles.message}>
              Send "{dateOption.message}" to{'\n'}
              <Text style={styles.highlight}>{profileName || 'this user'}</Text>
              <Text style={styles.messageMuted}>?</Text>
            </Text>

            {/* Thin gold separator */}
            <LinearGradient
              colors={['transparent', 'rgba(212,175,55,0.4)', 'transparent']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.separator}
            />

            {/* Buttons */}
            <View style={styles.buttonContainer}>
              <TouchableOpacity onPress={onClose} style={styles.cancelButton} activeOpacity={0.6}>
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity onPress={onConfirm} style={styles.confirmButton} activeOpacity={0.85}>
                <LinearGradient
                  colors={['#C9A227', '#E8C84A', '#C9A227']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.gradientButton}
                >
                  <Text style={styles.confirmButtonText}>Send Request</Text>
                  <Ionicons name="arrow-forward" size={14} color="#1a1200" style={{ marginLeft: 6 }} />
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
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  modalCard: {
    width: width * 0.82,
    maxWidth: 350,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: 'rgba(212, 175, 55, 0.45)',
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#D4AF37',
        shadowOffset: { width: 0, height: 12 },
        shadowOpacity: 0.35,
        shadowRadius: 28,
      },
      android: {
        elevation: 16,
      },
    }),
  },
  borderOverlay: {
    borderRadius: 28,
    overflow: 'hidden',
  },
  shimmerLine: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 60,
    backgroundColor: 'rgba(212, 175, 55, 0.07)',
    transform: [{ skewX: '-20deg' }],
  },
  content: {
    alignItems: 'center',
    paddingHorizontal: 28,
    paddingTop: 36,
    paddingBottom: 28,
  },
  iconWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  glowCircle: {
    position: 'absolute',
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(212, 175, 55, 0.18)',
  },
  iconBg: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(212, 175, 55, 0.5)',
  },
  dotRow: {
    flexDirection: 'row',
    gap: 5,
    marginBottom: 18,
  },
  dot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#D4AF37',
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#F5E6C0',
    marginBottom: 12,
    letterSpacing: 0.6,
  },
  message: {
    fontSize: 15,
    color: 'rgba(245, 230, 192, 0.55)',
    textAlign: 'center',
    lineHeight: 23,
    marginBottom: 24,
  },
  messageMuted: {
    color: 'rgba(245, 230, 192, 0.4)',
  },
  highlight: {
    color: '#D4AF37',
    fontWeight: '700',
  },
  separator: {
    width: '100%',
    height: 1,
    marginBottom: 24,
  },
  buttonContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 30,
    borderWidth: 1,
    borderColor: 'rgba(212, 175, 55, 0.2)',
  },
  cancelButtonText: {
    color: 'rgba(245, 230, 192, 0.45)',
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  confirmButton: {
    flex: 1.8,
    borderRadius: 30,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#D4AF37',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.5,
        shadowRadius: 12,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  gradientButton: {
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  confirmButtonText: {
    color: '#1a1200',
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
});

export default DateConfirmationModal;
