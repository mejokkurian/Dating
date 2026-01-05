import React, { useState } from "react";
import { StyleSheet, Text, View, Dimensions } from "react-native";
import { GestureDetector, Gesture } from "react-native-gesture-handler";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  runOnJS,
  interpolate,
  Extrapolate,
} from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";

// Separate Draggable Pill Component
const DraggablePill = ({ option, onDrop, swipeAnimatedValue }) => {
  const [isDragging, setIsDragging] = useState(false);

  // Shared values
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const scale = useSharedValue(1);

  const resetPosition = () => {
    translateX.value = withSpring(0);
    translateY.value = withSpring(0);
    scale.value = withSpring(1);
  };

  const panGesture = Gesture.Pan()
    .onBegin(() => {
      scale.value = withSpring(1.1);
      runOnJS(setIsDragging)(true);
    })
    .onUpdate((event) => {
      translateX.value = event.translationX;
      translateY.value = event.translationY;
    })
    .onEnd((event) => {
      runOnJS(setIsDragging)(false);
      const draggedDown = event.translationY > 150; 
      
      if (draggedDown) {
         runOnJS(onDrop)(resetPosition, option);
      } else {
         runOnJS(resetPosition)();
      }
    });

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { translateX: translateX.value },
        { translateY: translateY.value },
        { scale: scale.value },
      ],
      zIndex: isDragging ? 999 : 1,
    };
  });

  // Opacity based on swipe up
  const containerAnimatedStyle = useAnimatedStyle(() => {
      if (!swipeAnimatedValue) return {};
      
      const opacity = interpolate(
          swipeAnimatedValue.value,
          [-150, -50, 0], 
          [0, 0.5, 1],
          Extrapolate.CLAMP
      );
      
      return { opacity };
  });

  return (
    <GestureDetector gesture={panGesture}>
      <Animated.View style={[styles.pillContainer, animatedStyle, containerAnimatedStyle]}>
        <LinearGradient
          colors={["rgba(20,20,20,0.9)", "rgba(40,40,40,0.8)"]} // Dark Premium Gradient
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.gradient}
        >
          <View style={styles.iconContainer}>
            <Ionicons name={option.icon} size={14} color="#D4AF37" />
          </View>
          <Text style={styles.text}>{option.label}</Text>
          <View style={styles.dragIndicator}>
              <Ionicons name="chevron-down" size={10} color="#D4AF37" />
          </View>
        </LinearGradient>
      </Animated.View>
    </GestureDetector>
  );
};

const DATE_OPTIONS = [
  { 
    id: 'coffee', 
    label: 'Coffee', 
    icon: 'cafe', 
    message: "☕ Let's grab a coffee!",
  },
  { 
    id: 'drinks', 
    label: 'Drinks', 
    icon: 'wine', 
    message: "🍷 Grab a drink?",
  },
  { 
    id: 'dinner', 
    label: 'Dinner', 
    icon: 'restaurant', 
    message: "🍽️ Dinner sometime?",
  },
];

const DateCallToAction = ({ onDrop, visible = true, swipeAnimatedValue }) => {
  if (!visible) return null;

  return (
    <View style={styles.container}>
      {DATE_OPTIONS.map((option) => (
        <DraggablePill 
            key={option.id} 
            option={option} 
            onDrop={onDrop} 
            swipeAnimatedValue={swipeAnimatedValue}
        />
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    top: 95, 
    alignSelf: "center",
    zIndex: 100,
    flexDirection: "row", // Horizontal layout
    gap: 8, // Space between pills
  },
  pillContainer: {
    shadowColor: "#D4AF37", // Golden shadow (subtle)
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
    borderRadius: 20,
  },
  gradient: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 6, 
    paddingHorizontal: 12, 
    borderRadius: 20,
    gap: 6,
    borderWidth: 1,
    borderColor: "rgba(212, 175, 55, 0.4)", // Subtle Gold Border
  },
  iconContainer: {
    backgroundColor: "rgba(212, 175, 55, 0.1)", // Gold tint background
    borderRadius: 12,
    padding: 4,
  },
  text: {
    color: "#F5F5F5", // Off-white
    fontWeight: "600",
    fontSize: 12,
    letterSpacing: 0.5,
  },
  dragIndicator: {
    marginLeft: 2,
    opacity: 0.8
  }
});

export default DateCallToAction;
