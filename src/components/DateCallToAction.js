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
      Extrapolate.CLAMP,
    );

    return { opacity };
  });

  return (
    <GestureDetector gesture={panGesture}>
      <Animated.View
        style={[styles.pillContainer, animatedStyle, containerAnimatedStyle]}
      >
        <LinearGradient
          colors={["rgba(15,12,8,0.95)", "rgba(35,28,15,0.92)"]} // Rich dark gold-tinted gradient
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
    id: "coffee",
    label: "Coffee",
    icon: "cafe",
    message: "☕ Let's grab a coffee!",
  },
  {
    id: "drinks",
    label: "Drinks",
    icon: "wine",
    message: "🍷 Grab a drink?",
  },
  {
    id: "dinner",
    label: "Dinner",
    icon: "restaurant",
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
    top: 105,
    left: 15,
    right: 15,
    zIndex: 100,
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
  },
  pillContainer: {
    // shadowColor: "#D4AF37",
    // shadowOffset: { width: 0, height: 6 },
    // shadowOpacity: 0.35,
    // shadowRadius: 12,
    elevation: 8,
    // borderRadius: 26,
  },
  gradient: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 26,
    gap: 6,
    borderWidth: 1,
    borderColor: "rgba(212, 175, 55, 0.6)",
  },
  iconContainer: {
    backgroundColor: "rgba(212, 175, 55, 0.2)",
    borderRadius: 14,
    padding: 5,
  },
  text: {
    color: "#F5E6C0",
    fontWeight: "700",
    fontSize: 12,
    letterSpacing: 1.0,
  },
  dragIndicator: {
    marginLeft: 1,
    opacity: 0.9,
  },
});

export default DateCallToAction;
