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
          colors={option.gradient || ["#FF9A9E", "#FECFEF"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.gradient}
        >
          <View style={styles.iconContainer}>
            <Ionicons name={option.icon} size={16} color="#FFF" />
          </View>
          <Text style={styles.text}>{option.label}</Text>
          <View style={styles.dragIndicator}>
              <Ionicons name="chevron-down" size={12} color="rgba(255,255,255,0.8)" />
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
    gradient: ['#F2994A', '#F2C94C'] // Vivid Orange/Gold
  },
  { 
    id: 'drinks', 
    label: 'Drinks', 
    icon: 'wine', 
    message: "🍷 Grab a drink?",
    gradient: ['#DA22FF', '#9733EE'] // Neon Purple
  },
  { 
    id: 'dinner', 
    label: 'Dinner', 
    icon: 'restaurant', 
    message: "🍽️ Dinner sometime?",
    gradient: ['#00C6FF', '#0072FF'] // Science Blue
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
    gap: 10, // Space between pills
  },
  pillContainer: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  gradient: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 6, 
    paddingHorizontal: 10, 
    borderRadius: 20,
    gap: 5,
  },
  iconContainer: {
    backgroundColor: "rgba(255,255,255,0.2)",
    borderRadius: 12,
    padding: 3,
  },
  text: {
    color: "#FFF",
    fontWeight: "600",
    fontSize: 12,
    textShadowColor: "rgba(0,0,0,0.1)",
    textShadowRadius: 2,
  },
  dragIndicator: {
    marginLeft: 0,
    marginTop: 1
  }
});

export default DateCallToAction;
