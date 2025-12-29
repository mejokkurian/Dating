import React, { useEffect, useState, useImperativeHandle, forwardRef } from "react";
import { StyleSheet, View, Dimensions } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  withDelay,
  Easing,
  interpolate,
  runOnJS,
  withSequence,
} from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

const PARTICLE_COUNT = 30; // Increased particle count for better effect

const Particle = ({ index, trigger, delay = 0 }) => {
  const x = useSharedValue(0);
  const y = useSharedValue(0);
  const scale = useSharedValue(0);
  const opacity = useSharedValue(1);

  useEffect(() => {
    if (trigger > 0) {
      // Reset
      x.value = 0;
      y.value = 0;
      scale.value = 0;
      opacity.value = 1;

      // Random angle and distance
      const angle = (Math.random() * 360 * Math.PI) / 180;
      const distance = 120 + Math.random() * 200; // Explode further out
      const targetX = Math.cos(angle) * distance;
      const targetY = Math.sin(angle) * distance;

      // Animate with delay to sync after heart explosion
      const startDelay = delay + (Math.random() * 200); // Slight random variance in start

      scale.value = withDelay(startDelay, withSpring(1));
      x.value = withDelay(startDelay, withTiming(targetX, { duration: 1000, easing: Easing.out(Easing.exp) }));
      y.value = withDelay(startDelay, withTiming(targetY, { duration: 1000, easing: Easing.out(Easing.exp) }));
      // Fade out
      opacity.value = withDelay(startDelay + 500, withTiming(0, { duration: 500 }));
    }
  }, [trigger, delay]);

  const style = useAnimatedStyle(() => {
    return {
      transform: [
        { translateX: x.value },
        { translateY: y.value },
        { scale: scale.value },
      ],
      opacity: opacity.value,
    };
  });

  return (
    <Animated.View style={[styles.particle, style]}>
      <Ionicons name="star" size={20 + Math.random() * 10} color="#FFD700" />
    </Animated.View>
  );
};

const HeartExplosion = ({ trigger }) => {
    const scale = useSharedValue(0);
    const opacity = useSharedValue(0);

    useEffect(() => {
        if (trigger > 0) {
            // Reset
            scale.value = 0.5; // Start slightly larger than 0 to be safe
            opacity.value = 1; // Instant visibility

            // Pops in
            scale.value = withSpring(1.5, { damping: 12, stiffness: 100 });

            // Explode/Fade out (Trigger stars around 400ms)
            opacity.value = withDelay(500, withTiming(0, { duration: 200 }));
            // Scale up massively as it fades to simulate "popping"
            scale.value = withDelay(500, withTiming(3, { duration: 300 }));
        }
    }, [trigger]);

    const style = useAnimatedStyle(() => ({
        transform: [{ scale: scale.value }],
        opacity: opacity.value
    }));

    return (
        <Animated.View style={[styles.centerIcons, style]}>
            <Ionicons name="heart" size={100} color="#FF1744" style={styles.shadow} />
        </Animated.View>
    );
};

const SuperLikeOverlay = forwardRef((props, ref) => {
  const [trigger, setTrigger] = useState(0);

  useImperativeHandle(ref, () => ({
    triggerAnimation: () => {
      setTrigger((prev) => prev + 1);
    },
  }));

  if (trigger === 0) return null;

  return (
    <View style={styles.container} pointerEvents="none">
        {/* Heart explodes first */}
        <HeartExplosion trigger={trigger} />
        
        {/* Stars explode after heart (approx 350-400ms delay) */}
        {Array.from({ length: PARTICLE_COUNT }).map((_, i) => (
          <Particle key={i} index={i} trigger={trigger} delay={350} />
        ))}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 9999,
  },
  particle: {
    position: "absolute",
  },
  centerIcons: {
      position: 'absolute',
      justifyContent: 'center',
      alignItems: 'center'
  },
  shadow: {
      shadowColor: "#FF1744",
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.5,
      shadowRadius: 20,
      textShadowColor: "rgba(255, 23, 68, 0.5)",
      textShadowRadius: 10,
  }
});

export default SuperLikeOverlay;
