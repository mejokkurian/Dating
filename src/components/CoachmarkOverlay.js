import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions, Animated, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';

const { width, height } = Dimensions.get('window');

/**
 * CoachmarkOverlay
 * 
 * Guides users through app features with a spotlight effect and instructions.
 * 
 * Props:
 * - visible: boolean
 * - step: number (current step index)
 * - steps: Array of objects:
 *   {
 *     title: string,
 *     message: string,
 *     icon: string, // Ionicons name
 *     position: 'center' | 'bottom' | 'top' | 'pill', // Presets for identifying target area
 *     customStyle: Object // Optional coordinate overrides
 *   }
 * - onComplete: function
 * - onNext: function (called when user advances)
 */
const CoachmarkOverlay = ({ 
  visible, 
  step = 0, 
  steps = [], 
  onComplete, 
  onNext 
}) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  }, [visible, step]);

  if (!visible || !steps[step]) return null;

  const currentStep = steps[step];

  // Calculate highlighting area based on position preset
  // This is a "fake" spotlight for simplicity, effectively darkening the whole screen
  // and placing instructions near the target.
  const getPositionStyles = (pos) => {
    switch (pos) {
      case 'center': // For Card
        return {
          top: height * 0.35,
          alignItems: 'center',
        };
      case 'bottom-sheet': // For Bottom Sheet Actions
        return {
          position: 'absolute',
          bottom: 180,
          width: '100%',
          alignItems: 'center',
        };
      case 'pill': // For Instant Date Pill
        return {
          position: 'absolute',
          bottom: 250, 
          right: 20,
          alignItems: 'flex-end',
        };
      default:
        return {
            top: height / 2 - 100,
            alignItems: 'center',
        };
    }
  };

  const handleNext = () => {
    if (step < steps.length - 1) {
      onNext && onNext();
    } else {
      onComplete && onComplete();
    }
  };

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      {/* Dark Overlay Background */}
      <Animated.View style={[styles.backdrop, { opacity: fadeAnim }]}>
         <TouchableOpacity 
            activeOpacity={1} 
            style={StyleSheet.absoluteFill} 
            onPress={handleNext}
         />
         
         {/* Instruction Container */}
         <View style={[styles.container, getPositionStyles(currentStep.position)]} pointerEvents="box-none">
            
            {/* Visual Indicator (Hand/Icon) */}
            {currentStep.icons ? (
                <View style={styles.multiIconContainer}>
                    {currentStep.icons.map((iconName, index) => (
                        <View key={index} style={[styles.iconCircle, styles.multiIconCircle]}>
                            <Ionicons name={iconName} size={28} color="#D4AF37" />
                        </View>
                    ))}
                </View>
            ) : (
                <View style={styles.iconCircle}>
                    <Ionicons name={currentStep.icon || "finger-print"} size={32} color="#D4AF37" />
                </View>
            )}
            
            {/* Text Content */}
            <View style={styles.textContainer}>
                <Text style={styles.title}>{currentStep.title}</Text>
                <Text style={styles.message}>{currentStep.message}</Text>
            </View>

            {/* Action Button */}
            <TouchableOpacity onPress={handleNext} style={styles.button}>
                <Text style={styles.buttonText}>
                    {step === steps.length - 1 ? "Got it!" : "Next"}
                </Text>
            </TouchableOpacity>
         </View>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.85)',
    zIndex: 9999,
  },
  container: {
    paddingHorizontal: 30,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#FFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    shadowColor: "#D4AF37",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 8,
  },
  textContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    color: '#D4AF37', // Gold
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center',
  },
  message: {
    color: '#FFF',
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
  },
  button: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#D4AF37',
  },
  buttonText: {
    color: '#FFF',
    fontWeight: 'bold',
    fontSize: 16,
  },
  multiIconContainer: {
    flexDirection: 'row',
    gap: 15,
    marginBottom: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  multiIconCircle: {
    marginBottom: 0, // Reset margin since container handles gap
    width: 56,
    height: 56,
  }
});

export default CoachmarkOverlay;
