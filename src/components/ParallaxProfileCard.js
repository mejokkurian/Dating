import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  Image,
  Pressable,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  interpolate,
  runOnJS,
} from "react-native-reanimated";
import { GestureDetector, Gesture } from "react-native-gesture-handler";
import { Audio } from "expo-av";
import { Gyroscope } from "expo-sensors";
import theme from "../theme/theme";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

const SWIPE_THRESHOLD = -150;

const ParallaxProfileCard = ({
  data,
  onSwipeUp,
  onCardPress,
  disabled = false,
  swipeAnimatedValue,
}) => {
  // --- Audio Aura Logic ---
  const [sound, setSound] = useState(null);

  useEffect(() => {
    let soundObject = null;

    const playAudioAura = async () => {
      try {
        const { sound: newSound } = await Audio.Sound.createAsync(
            { uri: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3' }, // Demo URL
            { isLooping: true, volume: 0, shouldPlay: true }
        );
        soundObject = newSound;
        setSound(newSound);
        await newSound.setVolumeAsync(0.3);
      } catch (error) {
        // console.log("Audio Aura not available");
      }
    };

    // playAudioAura();

    return () => {
      if (soundObject) {
        soundObject.unloadAsync();
      }
    };
  }, [data.id]);

  // --- Manual Sensor & Animation ---
  const gyroX = useSharedValue(0);
  const gyroY = useSharedValue(0);

  useEffect(() => {
    Gyroscope.setUpdateInterval(50); // 20fps is enough for subtle parallax

    const subscription = Gyroscope.addListener((data) => {
      // Direct raw assignment, filtering small noise
      const x = data.x || 0;
      const y = data.y || 0;
      
      // Update shared values
      gyroX.value = withSpring(x, { damping: 50 });
      gyroY.value = withSpring(y, { damping: 50 });
    });

    return () => {
      subscription.remove();
    };
  }, []);

  const translateX = useSharedValue(0);
  const internalTranslateY = useSharedValue(0);
  const translateY = swipeAnimatedValue || internalTranslateY;
  const cardScale = useSharedValue(1);

  // --- Parallax Effect Logic ---
  const imageStyle = useAnimatedStyle(() => {
    const CLAMP = 20; 
    return {
      transform: [
        { translateX: interpolate(gyroY.value, [-3, 3], [CLAMP, -CLAMP]) },
        { translateY: interpolate(gyroX.value, [-3, 3], [CLAMP, -CLAMP]) },
        { scale: 1.15 },
      ],
    };
  });

  const textLayerStyle = useAnimatedStyle(() => {
    const CLAMP = 15;
    return {
      transform: [
        { translateX: interpolate(gyroY.value, [-3, 3], [-CLAMP, CLAMP]) },
        { translateY: interpolate(gyroX.value, [-3, 3], [-CLAMP, CLAMP]) },
      ],
    };
  });

  // --- Gesture Logic ---
  const panGesture = Gesture.Pan()
    .enabled(!disabled)
    .onBegin(() => {
      // scale down slightly
    })
    .onUpdate((event) => {
      // Only vertical upward movement
      if (event.translationY < 0) {
         translateY.value = event.translationY;
      } else {
         translateY.value = event.translationY * 0.2; // Rubber band
      }
      cardScale.value = withTiming(0.98, { duration: 100 });
    })
    .onEnd((event) => {
      cardScale.value = withSpring(1);
      if (event.translationY < SWIPE_THRESHOLD) {
        // Swipe Up!
        translateY.value = withTiming(-SCREEN_HEIGHT, { duration: 300 }, (finished) => {
          if (finished) {
            runOnJS(onSwipeUp)(data);
            translateY.value = 0; 
          }
        });
      } else {
        // Reset to center
        translateY.value = withSpring(0);
      }
    });

  const cardContainerStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { translateX: translateX.value },
        { translateY: translateY.value },
        { scale: cardScale.value },
      ],
      // Simplify opacity to avoid potential issues for now
      opacity: 1, 
      // opacity: interpolate(translateY.value, [-SCREEN_HEIGHT/2, 0], [0.5, 1]),
    };
  });

  // Stamp Opacity (PASS/UNMATCH)
  const rejectOpacity = useAnimatedStyle(() => {
     return {
       // Manual interpolation logic explanation:
       // When translateY goes up (negative), we want opacity 0 -> 1.
       // -50 (start showing) -> -150 (fully shown)
       opacity: interpolate(translateY.value, [-150, -50], [1, 0]),
     };
  });

  const mainPhotoIndex = data.mainPhotoIndex ?? 0;
  const mainPhoto = data.photos && data.photos.length > 0
      ? data.photos[mainPhotoIndex] || data.photos[0]
      : "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=500";

  return (
    <GestureDetector gesture={panGesture}>
      <Animated.View style={[styles.container, cardContainerStyle]}>
        <Pressable
          onPress={() => !disabled && onCardPress(data)}
          style={{ flex: 1 }}
          delayLongPress={500}
        >
          {/* Parallax Image */}
          <View style={styles.imageContainer}>
            <Animated.Image
              source={{ uri: mainPhoto }}
              style={[styles.cardImage, imageStyle]}
              resizeMode="cover"
            />
          </View>
          
          <LinearGradient
            colors={["transparent", "rgba(0,0,0,0.8)"]}
            style={styles.gradient}
          />
          
          <Animated.View style={[styles.rejectStamp, rejectOpacity]}>
            <Ionicons name="close-circle" size={100} color="#FFFFFF" />
            <Text style={styles.rejectText}>PASS</Text>
          </Animated.View>
          
          <Animated.View style={[styles.cardInfo, textLayerStyle]}>
             <View style={styles.nameRow}>
              <Text style={styles.name}>
                {data.name || data.displayName}, {data.age}
              </Text>
              {data.isVerified && (
                <MaterialCommunityIcons
                  name="check-decagram"
                  size={24}
                  color="#4CAF50"
                  style={styles.iconDropShadow}
                />
              )}
              {data.isPremium && (
                 <MaterialCommunityIcons 
                    name="crown" 
                    size={24} 
                    color="#FFD700" 
                    style={styles.iconDropShadow}
                 />
              )}
            </View>

            {data.bio && (
              <Text style={styles.bio} numberOfLines={2}>
                {data.bio}
              </Text>
            )}

            <View style={styles.detailsRow}>
              {data.location && (
                <View style={styles.detailItem}>
                  <Ionicons name="location" size={16} color="rgba(255,255,255,0.9)" />
                  <Text style={styles.detailTextLocation}>{data.location}</Text>
                </View>
              )}
              {data.distance && (
                <View style={styles.detailItem}>
                  <Ionicons name="navigate" size={14} color="rgba(255,255,255,0.7)" />
                  <Text style={styles.detailTextDistance}>{data.distance} km</Text>
                </View>
              )}
            </View>
            
            <View style={styles.swipUpHint}>
                <Ionicons name="chevron-up" size={20} color="rgba(255,255,255,0.6)" />
                <Text style={styles.swipUpText}>Swipe up to Pass</Text>
            </View>
          </Animated.View>
        </Pressable>
      </Animated.View>
    </GestureDetector>
  );
};

const styles = StyleSheet.create({
  container: {
    width: SCREEN_WIDTH - 30,
    height: SCREEN_HEIGHT * 0.70, // Slightly increased height
    borderRadius: 24,
    backgroundColor: "#1a1a1a",
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  imageContainer: {
    flex: 1,
    overflow: "hidden",
    borderRadius: 24,
  },
  cardImage: {
    width: "100%",
    height: "100%",
  },
  gradient: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: "50%",
    borderRadius: 24,
  },
  rejectStamp: {
    position: "absolute",
    top: "30%",
    alignSelf: "center",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 10,
  },
  rejectText: {
    color: "#FFFFFF",
    fontSize: 24,
    fontWeight: "bold",
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowRadius: 10,
  },
  cardInfo: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: 24,
    paddingBottom: 30,
    zIndex: 20,
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
  },
  name: {
    fontSize: 32,
    fontWeight: "800",
    color: "#fff",
    textShadowColor: "rgba(0, 0, 0, 0.5)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 10,
    letterSpacing: 0.5,
  },
  iconDropShadow: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 2,
  },
  bio: {
    fontSize: 16,
    color: "rgba(255,255,255,0.9)",
    marginBottom: 12,
    lineHeight: 22,
    textShadowColor: "rgba(0, 0, 0, 0.5)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  detailsRow: {
    flexDirection: "row",
    gap: 16,
    alignItems: "center",
  },
  detailItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(0,0,0,0.3)",
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 12,
  },
  detailTextLocation: {
    fontSize: 14,
    color: "#fff",
    fontWeight: "600",
  },
  detailTextDistance: {
    fontSize: 13,
    color: "rgba(255,255,255,0.8)",
  },
  swipUpHint: {
      position: 'absolute',
      bottom: 5,
      alignSelf: 'center',
      alignItems: 'center',
      opacity: 0.8
  },
  swipUpText: {
      color: 'rgba(255,255,255,0.6)',
      fontSize: 10,
      marginTop: -2
  }
});

export default ParallaxProfileCard;
