import React, { useRef, useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, Image, Animated, PanResponder, Dimensions } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';

const SWIPE_THRESHOLD = 150; // Distance needed to trigger action
const BUTTON_WIDTH = Dimensions.get('window').width - 48; // Restoring wider width
const BUTTON_HEIGHT = 56;
const BUTTON_PADDING = 4;

const OnboardingIntroScreen = ({ navigation, route }) => {
  // Pass forward the parameters from AgeVerification (age, birthDate)
  const { age, birthDate } = route.params || {};

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;
  const arrowAnim = useRef(new Animated.Value(0)).current;

  // Swipe Animation Values
  const pan = useRef(new Animated.ValueXY()).current;
  const [complete, setComplete] = useState(false);

  useEffect(() => {
    // Initial entrance animations
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 800,
        useNativeDriver: true,
      }),
    ]).start();

    // Loop animation for the arrow
    Animated.loop(
        Animated.sequence([
            Animated.timing(arrowAnim, {
                toValue: 1,
                duration: 1000,
                useNativeDriver: true,
            }),
            Animated.timing(arrowAnim, {
                toValue: 0,
                duration: 0,
                useNativeDriver: true,
            })
        ])
    ).start();
  }, []);

  // Reset button when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      setComplete(false);
      pan.setValue({ x: 0, y: 0 });
    }, [])
  );

  const handleContinue = () => {
    navigation.navigate('Onboarding', { age, birthDate });
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderMove: (_, gestureState) => {
        if (!complete && gestureState.dx > 0 && gestureState.dx <= BUTTON_WIDTH - BUTTON_HEIGHT) {
            pan.setValue({ x: gestureState.dx, y: 0 });
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dx > SWIPE_THRESHOLD) {
            // Success swipe
            setComplete(true);
            Animated.spring(pan, {
                toValue: { x: BUTTON_WIDTH - BUTTON_HEIGHT - (BUTTON_PADDING * 2), y: 0 },
                useNativeDriver: false
            }).start(() => {
                // Reduced delay for snappier feel
                setTimeout(handleContinue, 50);
            });
        } else {
            // Reset if not swiped enough
            Animated.spring(pan, {
                toValue: { x: 0, y: 0 },
                useNativeDriver: false
            }).start();
        }
      }
    })
  ).current;

  // Opacity of the "Swipe to start" text based on drag
  const textOpacity = pan.x.interpolate({
    inputRange: [0, SWIPE_THRESHOLD * 0.5], // Fade out faster
    outputRange: [1, 0],
    extrapolate: 'clamp'
  });

  // Opacity for the revealed text
  const revealOpacity = pan.x.interpolate({
    inputRange: [0, SWIPE_THRESHOLD * 0.8], // Start fading in immediately
    outputRange: [0, 1],
    extrapolate: 'clamp'
  });

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#FFFFFF', '#F8F9FA']}
        style={StyleSheet.absoluteFill}
      />
      
      <SafeAreaView style={styles.content}>
        <View style={styles.header}>
            <View style={styles.iconContainer}>
                <Ionicons name="sparkles" size={40} color="#D4AF37" />
            </View>
        </View>

        <Animated.View 
          style={[
            styles.mainContent,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }]
            }
          ]}
        >
          <Text style={styles.title}>Welcome to the Club</Text>
          
          <Text style={styles.description}>
            We're committed to finding your <Text style={styles.highlight}>perfect match</Text>.
          </Text>

          <View style={styles.card}>
            <View style={styles.infoRow}>
              <Ionicons name="image-outline" size={24} color="#D4AF37" />
              <View style={styles.infoTextContainer}>
                <Text style={styles.infoTitle}>Use High Quality Photos</Text>
                <Text style={styles.infoText}>
                  Your profile is your first impression. Clear, bright photos get 3x more likes.
                </Text>
              </View>
            </View>

            <View style={styles.divider} />

            <View style={styles.infoRow}>
              <Ionicons name="star-outline" size={24} color="#D4AF37" />
              <View style={styles.infoTextContainer}>
                <Text style={styles.infoTitle}>Be Authentic</Text>
                <Text style={styles.infoText}>
                  Enter accurate details. Our algorithm uses this to connect you with compatible people.
                </Text>
              </View>
            </View>
          </View>
          
          <Text style={styles.note}>
            Ready to build your profile?
          </Text>
        </Animated.View>

        <View style={styles.footer}>
            {/* Swipe Button */}
            <View style={styles.swipeContainer}>
                {/* Default Text */}
                <Animated.View style={[styles.swipeTextContainer, { opacity: textOpacity }]}>
                    <Text style={styles.swipeText}>Swipe to get started</Text>
                    <View style={{ flexDirection: 'row' }}>
                        {[0, 1, 2].map((i) => (
                            <Animated.View
                                key={i}
                                style={{
                                    opacity: arrowAnim.interpolate({
                                        inputRange: [0, 0.5, 1],
                                        outputRange: [0.3, 1, 0.3], // Pulse effect
                                        extrapolate: 'clamp'
                                    }),
                                    transform: [{
                                        translateX: arrowAnim.interpolate({
                                            inputRange: [0, 1],
                                            outputRange: [0, 5], // Move right slightly
                                        })
                                    }],
                                    marginLeft: -4 // Stack them slightly
                                }}
                            >
                                <Ionicons name="chevron-forward" size={18} color="#D4AF37" />
                            </Animated.View>
                        ))}
                    </View>
                </Animated.View>

                {/* Revealed Text (Hidden Behind) */}
                <Animated.View style={[styles.revealTextContainer, { opacity: revealOpacity }]}>
                    <Text style={styles.revealText}>Start Matching ✨</Text>
                </Animated.View>
                
                <Animated.View
                    style={[
                        styles.swipeKnob,
                        {
                            transform: [{ translateX: pan.x }]
                        }
                    ]}
                    {...panResponder.panHandlers}
                >
                    <Ionicons name="arrow-forward" size={24} color="#FFF" />
                </Animated.View>
            </View>
        </View>
      </SafeAreaView>
    </View>
  );

};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  content: {
    flex: 1,
    padding: 24,
  },
  header: {
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 40,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#FFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#D4AF37',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 8,
  },
  mainContent: {
    flex: 1,
    alignItems: 'center',
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    color: '#000',
    marginBottom: 16,
    textAlign: 'center',
  },
  description: {
    fontSize: 18,
    color: '#666',
    textAlign: 'center',
    marginBottom: 48,
    lineHeight: 26,
    paddingHorizontal: 20,
  },
  highlight: {
    color: '#D4AF37',
    fontWeight: '700',
  },
  card: {
    backgroundColor: '#FFF',
    borderRadius: 24,
    padding: 24,
    width: '90%', // Reduced from 100% to create breathing room
    alignSelf: 'center', // Center the card
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 8,
  },
  infoTextContainer: {
    flex: 1,
    marginLeft: 16,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#000',
    marginBottom: 4,
  },
  infoText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  divider: {
    height: 1,
    backgroundColor: '#f0f0f0',
    marginVertical: 16,
  },
  note: {
    marginTop: 'auto',
    fontSize: 14,
    color: '#999',
    fontWeight: '500',
  },
  footer: {
    marginTop: 24,
  },
  swipeContainer: {
      height: BUTTON_HEIGHT,
      backgroundColor: '#1C1C1E', // Darker, cleaner dark
      borderRadius: BUTTON_HEIGHT / 2,
      padding: BUTTON_PADDING,
      justifyContent: 'center',
      marginTop: 20,
      width: BUTTON_WIDTH,
      alignSelf: 'center',
      position: 'relative',
      // "Cave" / Inset effect using borders and colors
      borderWidth: 3,
      borderColor: '#2C2C2E', // Slightly lighter border to creating framing
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 }, // Drop shadow for the whole container (optional)
      shadowOpacity: 0.1,
      shadowRadius: 8,
      elevation: 2,
  },
  swipeKnob: {
      width: BUTTON_HEIGHT - (BUTTON_PADDING * 2),
      height: BUTTON_HEIGHT - (BUTTON_PADDING * 2),
      borderRadius: (BUTTON_HEIGHT - (BUTTON_PADDING * 2)) / 2,
      backgroundColor: '#D4AF37',
      justifyContent: 'center',
      alignItems: 'center',
      position: 'absolute',
      left: BUTTON_PADDING,
      zIndex: 2,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.2,
      shadowRadius: 4,
      elevation: 3,
  },
  swipeTextContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'flex-start', // Align to start (left) instead of center
      paddingLeft: BUTTON_HEIGHT + 10, // Push it just past the knob
      width: '100%',
      gap: 8,
  },
  swipeText: {
      color: '#D4AF37',
      fontSize: 16,
      fontWeight: '600',
      letterSpacing: 1,
  },
  revealTextContainer: {
      position: 'absolute',
      left: 0,
      width: '100%',
      height: '100%',
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 1,
  },
  revealText: {
      color: '#D4AF37',
      fontSize: 18,
      fontWeight: '800',
      letterSpacing: 1.5,
      // Shift slightly left to appear "behind" where the knob was, 
      // but center is usually fine.
  },
});

export default OnboardingIntroScreen;
