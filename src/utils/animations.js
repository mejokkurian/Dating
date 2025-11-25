import { Animated } from 'react-native';

// Fade In Animation
export const fadeIn = (animatedValue, duration = 250, toValue = 1) => {
  return Animated.timing(animatedValue, {
    toValue,
    duration,
    useNativeDriver: true,
  });
};

// Fade Out Animation
export const fadeOut = (animatedValue, duration = 250) => {
  return Animated.timing(animatedValue, {
    toValue: 0,
    duration,
    useNativeDriver: true,
  });
};

// Scale Animation
export const scale = (animatedValue, duration = 250, toValue = 1) => {
  return Animated.timing(animatedValue, {
    toValue,
    duration,
    useNativeDriver: true,
  });
};

// Spring Animation
export const spring = (animatedValue, toValue = 1, config = {}) => {
  return Animated.spring(animatedValue, {
    toValue,
    friction: 8,
    tension: 40,
    useNativeDriver: true,
    ...config,
  });
};

// Slide Animation
export const slide = (animatedValue, toValue, duration = 250) => {
  return Animated.timing(animatedValue, {
    toValue,
    duration,
    useNativeDriver: true,
  });
};

// Pulse Animation (Loop)
export const pulse = (animatedValue, minValue = 0.95, maxValue = 1.05, duration = 1000) => {
  return Animated.loop(
    Animated.sequence([
      Animated.timing(animatedValue, {
        toValue: maxValue,
        duration: duration / 2,
        useNativeDriver: true,
      }),
      Animated.timing(animatedValue, {
        toValue: minValue,
        duration: duration / 2,
        useNativeDriver: true,
      }),
    ])
  );
};

// Shake Animation
export const shake = (animatedValue) => {
  return Animated.sequence([
    Animated.timing(animatedValue, { toValue: 10, duration: 50, useNativeDriver: true }),
    Animated.timing(animatedValue, { toValue: -10, duration: 50, useNativeDriver: true }),
    Animated.timing(animatedValue, { toValue: 10, duration: 50, useNativeDriver: true }),
    Animated.timing(animatedValue, { toValue: 0, duration: 50, useNativeDriver: true }),
  ]);
};

// Rotate Animation
export const rotate = (animatedValue, toValue = 1, duration = 250) => {
  return Animated.timing(animatedValue, {
    toValue,
    duration,
    useNativeDriver: true,
  });
};

// Parallel Animations
export const parallel = (...animations) => {
  return Animated.parallel(animations);
};

// Sequential Animations
export const sequence = (...animations) => {
  return Animated.sequence(animations);
};

// Stagger Animations
export const stagger = (delay, animations) => {
  return Animated.stagger(delay, animations);
};

export default {
  fadeIn,
  fadeOut,
  scale,
  spring,
  slide,
  pulse,
  shake,
  rotate,
  parallel,
  sequence,
  stagger,
};
