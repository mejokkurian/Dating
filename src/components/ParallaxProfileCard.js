import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  Image,
  Pressable,
  ActivityIndicator,
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
  cardOpacity, // Destructured prop
  isLimitReachedShared,
  onSwipeLimited,
  accessibilityLabel,
  accessibilityHint,
}) => {
  // Image loading state
  const [imageLoading, setImageLoading] = useState(true);
  const [imageError, setImageError] = useState(false);

  // --- Audio Aura Logic ---
  const [sound, setSound] = useState(null);

  useEffect(() => {
    let soundObject = null;

    const playAudioAura = async () => {
      try {
        const { sound: newSound } = await Audio.Sound.createAsync(
          {
            uri: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3",
          }, // Demo URL
          { isLooping: true, volume: 0, shouldPlay: true },
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
    .activeOffsetY([-10, 10]) // Activate when vertical movement > 10
    .failOffsetX([-20, 20]) // Fail if horizontal movement > 20
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
        // Check limit before animating card away
        if (isLimitReachedShared && isLimitReachedShared.value) {
          translateY.value = withSpring(0);
          if (onSwipeLimited) runOnJS(onSwipeLimited)();
          return;
        }
        // Swipe Up!
        translateY.value = withTiming(
          -SCREEN_HEIGHT,
          { duration: 300 },
          (finished) => {
            if (finished) {
              runOnJS(onSwipeUp)(data);
              // NOTE: Removed translateY.value = 0 here to prevent snap-back
            }
          },
        );
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
      opacity: cardOpacity ? cardOpacity.value : 1,
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
  const mainPhoto =
    data.photos && data.photos.length > 0
      ? data.photos[mainPhotoIndex] || data.photos[0]
      : "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=500";

  return (
    <GestureDetector gesture={panGesture}>
      <Animated.View style={[styles.container, cardContainerStyle]}>
        <Pressable
          onPress={() => !disabled && onCardPress(data)}
          style={{ flex: 1 }}
          delayLongPress={500}
          accessible={true}
          accessibilityLabel={
            accessibilityLabel ||
            `Profile of ${data?.displayName || data?.name || "user"}`
          }
          accessibilityHint={
            accessibilityHint ||
            "Double tap to view full profile, swipe up to pass"
          }
          accessibilityRole="button"
          disabled={disabled}
        >
          {/* Parallax Image */}
          <View style={styles.imageContainer}>
            {imageLoading && !imageError && (
              <View style={styles.imageLoadingContainer}>
                <ActivityIndicator size="large" color={theme.colors.primary} />
              </View>
            )}
            {imageError && (
              <View style={styles.imageErrorContainer}>
                <Ionicons
                  name="image-outline"
                  size={60}
                  color={theme.colors.text?.secondary || "#999"}
                />
                <Text style={styles.imageErrorText}>Image unavailable</Text>
              </View>
            )}
            <Animated.Image
              source={{ uri: mainPhoto }}
              style={[
                styles.cardImage,
                imageStyle,
                (imageLoading || imageError) && styles.hiddenImage,
              ]}
              resizeMode="cover"
              onLoadStart={() => {
                setImageLoading(true);
                setImageError(false);
              }}
              onLoadEnd={() => {
                setImageLoading(false);
              }}
              onError={() => {
                setImageLoading(false);
                setImageError(true);
              }}
            />
          </View>

          <LinearGradient
            colors={["transparent", "rgba(0,0,0,0.45)", "rgba(0,0,0,0.92)"]}
            locations={[0, 0.45, 1]}
            style={styles.gradient}
          />

          <Animated.View style={[styles.rejectStamp, rejectOpacity]}>
            <Ionicons name="close-circle" size={100} color="#FFFFFF" />
            <Text style={styles.rejectText}>PASS</Text>
          </Animated.View>

          <Animated.View style={[styles.cardInfo, textLayerStyle]}>
            <View style={styles.nameRow}>
              <Text
                style={styles.name}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.7}
              >
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
                  <Ionicons
                    name="location"
                    size={16}
                    color="rgba(255,255,255,0.9)"
                  />
                  <Text style={styles.detailTextLocation}>{data.location}</Text>
                </View>
              )}
              {data.distance && (
                <View style={styles.detailItem}>
                  <Ionicons
                    name="navigate"
                    size={14}
                    color="rgba(255,255,255,0.7)"
                  />
                  <Text style={styles.detailTextDistance}>
                    {data.distance} km
                  </Text>
                </View>
              )}
            </View>

            <View style={styles.swipUpHint}>
              <Ionicons
                name="chevron-up"
                size={12}
                color="rgba(255,255,255,0.7)"
              />
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
    height: SCREEN_HEIGHT * 0.68,
    borderRadius: 28,
    backgroundColor: "#1a1a1a",
    overflow: "hidden",
    shadowColor: "#D4AF37",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.22,
    shadowRadius: 24,
    elevation: 14,
    borderWidth: 1,
    borderColor: "rgba(212,175,55,0.22)",
  },
  imageContainer: {
    flex: 1,
    overflow: "hidden",
    borderRadius: 28,
    position: "relative",
  },
  cardImage: {
    width: "100%",
    height: "100%",
  },
  hiddenImage: {
    opacity: 0,
  },
  imageLoadingContainer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: theme.colors.background?.secondary || "#F5F5F5",
  },
  imageErrorContainer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: theme.colors.background?.secondary || "#F5F5F5",
  },
  imageErrorText: {
    marginTop: 12,
    fontSize: 14,
    color: theme.colors.text?.secondary || "#999",
    textAlign: "center",
  },
  gradient: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: "65%",
    borderRadius: 28,
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
    textShadowColor: "rgba(0,0,0,0.5)",
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
    textShadowColor: "rgba(0, 0, 0, 0.7)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 12,
    letterSpacing: 0.8,
    flexShrink: 1,
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
    backgroundColor: "rgba(0,0,0,0.5)",
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(212,175,55,0.35)",
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
    position: "absolute",
    bottom: 6,
    alignSelf: "center",
    alignItems: "center",
    flexDirection: "row",
    gap: 4,
    opacity: 0.75,
    backgroundColor: "rgba(0,0,0,0.3)",
    paddingVertical: 3,
    paddingHorizontal: 10,
    borderRadius: 10,
  },
  swipUpText: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 10,
    letterSpacing: 0.5,
    fontWeight: "500",
  },
});

export default ParallaxProfileCard;
