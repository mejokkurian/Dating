import { useState, useRef } from 'react';
import { Animated, Easing } from 'react-native';

export const useProfileAnimations = () => {
  // --- Pass Animation State ---
  const [showPassAnimation, setShowPassAnimation] = useState(false);
  const [isPassLoading, setIsPassLoading] = useState(false);
  const passIconScale = useRef(new Animated.Value(1)).current;
  const passOverlayOpacity = useRef(new Animated.Value(0)).current;
  const passSpinnerRotate = useRef(new Animated.Value(0)).current;

  // --- Like Animation State ---
  const [showLikeAnimation, setShowLikeAnimation] = useState(false);
  const likeHeartScale = useRef(new Animated.Value(0)).current;
  const likeParticleOpacity = useRef(new Animated.Value(0)).current;

  // Create 6 particles with random-ish paths
  const particles = useRef([...Array(6)].map((_, i) => ({
    id: i,
    x: new Animated.Value(0),
    y: new Animated.Value(0),
    scale: new Animated.Value(0),
    opacity: new Animated.Value(1),
  }))).current;

  // --- Reset All Animations ---
  const resetAnimations = () => {
    // Pass Reset
    setShowPassAnimation(false);
    setIsPassLoading(false);
    passIconScale.setValue(1);
    passOverlayOpacity.setValue(0);
    passSpinnerRotate.setValue(0);

    // Like Reset
    setShowLikeAnimation(false);
    likeHeartScale.setValue(0);
    likeParticleOpacity.setValue(0);
  };

  // --- Trigger Pass Animation ---
  const triggerPassAnimation = async (onComplete) => {
    try {
      setShowPassAnimation(true);
      setIsPassLoading(true);

      // Small delay to ensure state is set
      await new Promise(resolve => setTimeout(resolve, 50));

      // Animate cross icon to center
      await new Promise((resolve) => {
        Animated.parallel([
          Animated.timing(passOverlayOpacity, {
            toValue: 1,
            duration: 350,
            useNativeDriver: true,
          }),
          Animated.spring(passIconScale, {
            toValue: 1.5,
            tension: 35,
            friction: 9,
            useNativeDriver: true,
          }),
        ]).start(resolve);
      });

      // Animate one full spin (0 -> 1) and wait for it to finish
      await new Promise((resolve) => {
        Animated.timing(passSpinnerRotate, {
          toValue: 1,
          duration: 1000,
          easing: Easing.linear,
          useNativeDriver: true,
        }).start(resolve);
      });

      // Execute callback
      if (onComplete) {
        onComplete();
      }
    } catch (error) {
      console.error('Pass animation error:', error);
      resetAnimations();
    }
  };

  // --- Trigger Like Animation (Heartfullness) ---
  const triggerLikeAnimation = (onComplete) => {
    try {
      setShowLikeAnimation(true);
      likeParticleOpacity.setValue(1);

      // 1. Main Heart "Heartbeat" (Thump-Thump)
      Animated.sequence([
        // Scale up fast
        Animated.spring(likeHeartScale, {
          toValue: 1.2,
          friction: 3,
          tension: 40,
          useNativeDriver: true
        }),
        // Scale down a bit (beat)
        Animated.timing(likeHeartScale, {
          toValue: 1.0,
          duration: 100,
          useNativeDriver: true
        }),
        // Scale up bigger (thump!)
        Animated.spring(likeHeartScale, {
          toValue: 1.4,
          friction: 3,
          tension: 40,
          useNativeDriver: true
        }),
        // Hold for a moment...
        Animated.delay(100),
        // Fade out
        Animated.timing(likeHeartScale, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true
        })
      ]).start();

      // 2. Particles Burst (Floating Hearts)
      const particleAnimations = particles.map((p) => {
        // Reset
        p.x.setValue(0);
        p.y.setValue(0);
        p.scale.setValue(0);
        p.opacity.setValue(1);

        // Random angles (-45 to 45 deg roughly)
        const angle = (Math.random() - 0.5) * Math.PI / 2;
        const distance = 100 + Math.random() * 100;
        const destX = Math.sin(angle) * distance;
        const destY = -Math.cos(angle) * distance * 1.5; // Go upwards

        return Animated.parallel([
          Animated.timing(p.x, {
            toValue: destX,
            duration: 1000 + Math.random() * 500,
            useNativeDriver: true
          }),
          Animated.timing(p.y, {
            toValue: destY,
            duration: 1000 + Math.random() * 500,
            useNativeDriver: true
          }),
          Animated.sequence([
            Animated.spring(p.scale, {
              toValue: 0.5 + Math.random() * 0.5,
              useNativeDriver: true
            }),
            Animated.timing(p.opacity, {
              toValue: 0,
              duration: 800,
              delay: 400,
              useNativeDriver: true
            })
          ])
        ]);
      });
      Animated.parallel(particleAnimations).start();

      // 3. Trigger Action after "feeling"
      setTimeout(() => {
        if (onComplete) {
          onComplete();
        }
      }, 3500); // Increased for extended visual completion
      
    } catch (error) {
       console.error('Like animation error:', error);
       resetAnimations();
    }
  };

  return {
    // Pass State & Refs
    showPassAnimation,
    isPassLoading,
    passIconScale,
    passOverlayOpacity,
    passSpinnerRotate,
    
    // Like State & Refs
    showLikeAnimation,
    likeHeartScale,
    likeParticleOpacity,
    particles,
    
    // Actions
    triggerPassAnimation,
    triggerLikeAnimation,
    resetAnimations,
  };
};
