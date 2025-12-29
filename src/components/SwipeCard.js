import React, { useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  Animated,
  PanResponder,
  Image,
  Pressable,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import theme from "../theme/theme";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");
const SWIPE_THRESHOLD = 120;

const SwipeCard = ({
  data,
  onSwipeUp,
  onCardPress,
  onDoubleTap,
  disabled = false,
}) => {
  const position = useRef(new Animated.ValueXY()).current;
  const lastTap = useRef({ current: null, timer: null });
  const gestureStarted = useRef(false);

  // Heart animation for like feedback
  const heartScale = useRef(new Animated.Value(0)).current;
  const heartOpacity = useRef(new Animated.Value(0)).current;
  const heartTranslateY = useRef(new Animated.Value(0)).current;

  // Remove horizontal rotation - only allow vertical movement
  const rejectOpacity = position.y.interpolate({
    inputRange: [-SWIPE_THRESHOLD, 0],
    outputRange: [1, 0],
    extrapolate: "clamp",
  });

  // Handle card press - called by Pressable
  const handlePress = () => {
    // Don't handle press if a swipe gesture has started
    if (gestureStarted.current) {
      return;
    }

    const now = Date.now();
    const DOUBLE_TAP_DELAY = 300;

    // Clear any existing timer
    if (lastTap.current.timer) {
      clearTimeout(lastTap.current.timer);
      lastTap.current.timer = null;
    }

    if (
      lastTap.current.current &&
      now - lastTap.current.current < DOUBLE_TAP_DELAY
    ) {
      // Double tap detected - show heart animation
      lastTap.current.current = null;

      // Trigger heart animation
      heartScale.setValue(0);
      heartOpacity.setValue(1);
      heartTranslateY.setValue(0);

      Animated.parallel([
        Animated.sequence([
          Animated.parallel([
            Animated.spring(heartScale, {
              toValue: 1.5,
              tension: 50,
              friction: 5,
              useNativeDriver: true,
            }),
            Animated.timing(heartTranslateY, {
              toValue: -30,
              duration: 400,
              useNativeDriver: true,
            }),
          ]),
          Animated.timing(heartOpacity, {
            toValue: 0,
            duration: 200,
            useNativeDriver: true,
          }),
        ]),
      ]).start(() => {
        heartScale.setValue(0);
        heartOpacity.setValue(0);
        heartTranslateY.setValue(0);
      });

      onDoubleTap && onDoubleTap(data);
    } else {
      // Single tap - wait for potential double tap
      lastTap.current.current = now;
      lastTap.current.timer = setTimeout(() => {
        if (lastTap.current.current === now && !gestureStarted.current) {
          // No second tap, treat as single tap
          onCardPress && onCardPress(data);
          lastTap.current.current = null;
        }
        lastTap.current.timer = null;
      }, DOUBLE_TAP_DELAY);
    }
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => !disabled,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        // Don't respond if disabled
        if (disabled) return false;
        // Always allow movement if we started capturing
        return true;
      },
      onPanResponderGrant: () => {
        // Touch started
      },
      onPanResponderMove: (_, gesture) => {
        // Check if it's an upward swipe
        if (Math.abs(gesture.dy) > 20 && gesture.dy < -15) {
          if (!gestureStarted.current) {
            gestureStarted.current = true;
            // Cancel any pending tap timers
            if (lastTap.current.timer) {
              clearTimeout(lastTap.current.timer);
              lastTap.current.timer = null;
            }
            if (lastTap.current.current) {
              lastTap.current.current = null;
            }
          }
          // Only allow upward movement (negative dy)
          if (gesture.dy < 0) {
            position.setValue({ x: 0, y: gesture.dy });
          }
        }
      },
      onPanResponderRelease: (_, gesture) => {
        const wasSwipe = gestureStarted.current;
        gestureStarted.current = false;

        // Check if it's a tap (minimal movement)
        if (
          !wasSwipe &&
          Math.abs(gesture.dx) < 15 &&
          Math.abs(gesture.dy) < 15
        ) {
          // It's a tap - handle it
          handlePress();
          return;
        }

        // Check for upward swipe (reject)
        if (gesture.dy < -SWIPE_THRESHOLD) {
          // Swipe Up - Reject
          forceSwipeUp();
        } else if (wasSwipe) {
          // Return to center if it was a swipe but didn't reach threshold
          resetPosition();
        }
      },
      onPanResponderTerminate: () => {
        gestureStarted.current = false;
        resetPosition();
      },
    })
  ).current;

  const forceSwipeUp = () => {
    Animated.timing(position, {
      toValue: { x: 0, y: -SCREEN_HEIGHT - 100 },
      duration: 250,
      useNativeDriver: false,
    }).start(() => {
      // Reset position first
      position.setValue({ x: 0, y: 0 });

      // Then trigger reject callback
      onSwipeUp && onSwipeUp(data);
    });
  };

  const resetPosition = () => {
    Animated.spring(position, {
      toValue: { x: 0, y: 0 },
      useNativeDriver: false,
      friction: 5,
    }).start();
  };

  const cardStyle = {
    ...position.getLayout(),
    // No rotation for vertical swipe
  };

  // Get main photo - use mainPhotoIndex if available, otherwise use first photo
  const mainPhotoIndex = data.mainPhotoIndex ?? 0;
  const mainPhoto =
    data.photos && data.photos.length > 0
      ? data.photos[mainPhotoIndex] || data.photos[0]
      : "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=500";

  return (
    <Animated.View
      style={[styles.card, cardStyle]}
      {...(!disabled ? panResponder.panHandlers : {})}
    >
      <Image
        source={{
          uri: mainPhoto,
        }}
        style={styles.cardImage}
      />

      {/* Gradient Overlay */}
      <LinearGradient
        colors={["transparent", "rgba(0,0,0,0.8)"]}
        style={styles.gradient}
      />

      {/* Reject Icon */}
      <Animated.View style={[styles.rejectStamp, { opacity: rejectOpacity }]}>
        <Ionicons name="close-circle" size={120} color="#F44336" />
      </Animated.View>

      {/* Heart Like Feedback */}
      <Animated.View
        style={[
          styles.heartFeedback,
          {
            opacity: heartOpacity,
            transform: [{ scale: heartScale }, { translateY: heartTranslateY }],
          },
        ]}
      >
        <Ionicons name="heart" size={80} color="#FF1744" />
      </Animated.View>

      {/* Card Info */}
      <View style={styles.cardInfo}>
        <View style={styles.nameRow}>
          <Text style={styles.name}>
            {data.name || data.displayName}, {data.age}
          </Text>
          {data.isVerified && (
            <MaterialCommunityIcons
              name="check-decagram"
              size={24}
              color="#4CAF50"
            />
          )}
          {data.isPremium && (
            <MaterialCommunityIcons name="crown" size={24} color="#FFD700" />
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
                color="rgba(255,255,255,0.8)"
              />
              <Text style={styles.detailTextLocation}>{data.location}</Text>
            </View>
          )}
          {data.distance && (
            <View style={styles.detailItem}>
              <Ionicons
                name="navigate"
                size={16}
                color="rgba(255,255,255,0.5)"
              />
              <Text style={styles.detailTextDistance}>{data.distance} km</Text>
            </View>
          )}
          {data.occupation && (
            <View style={styles.detailItem}>
              <Ionicons name="briefcase" size={16} color="#fff" />
              <Text style={styles.detailText}>{data.occupation}</Text>
            </View>
          )}
        </View>

        {data.relationshipExpectations && (
          <View style={styles.expectationsContainer}>
            <Ionicons name="heart-outline" size={14} color="#fff" />
            <Text style={styles.expectationsText} numberOfLines={1}>
              {data.relationshipExpectations}
            </Text>
          </View>
        )}
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  card: {
    width: SCREEN_WIDTH - 40,
    height: SCREEN_HEIGHT * 0.7,
    borderRadius: 20,
    backgroundColor: "#fff",
    overflow: "hidden",
    ...theme.shadows.xl,
  },
  cardImage: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
  gradient: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: "50%",
  },
  rejectStamp: {
    position: "absolute",
    top: "35%",
    left: "50%",
    marginLeft: -60,
    alignItems: "center",
    justifyContent: "center",
  },
  heartFeedback: {
    position: "absolute",
    top: "40%",
    left: "50%",
    marginLeft: -40,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 10,
  },

  cardInfo: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: 24,
    paddingBottom: 28,
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 10,
  },
  name: {
    fontSize: 30,
    fontWeight: "800",
    color: "#fff",
    textShadowColor: "rgba(0, 0, 0, 0.3)",
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  bio: {
    fontSize: 15,
    color: "rgba(255,255,255,0.95)",
    marginBottom: 14,
    lineHeight: 22,
    textShadowColor: "rgba(0, 0, 0, 0.2)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  detailsRow: {
    flexDirection: "row",
    gap: 16,
    marginBottom: 12,
  },
  detailItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  detailText: {
    fontSize: 14,
    color: "rgba(255,255,255,0.9)",
  },
  detailTextLocation: {
    fontSize: 14,
    color: "rgba(255,255,255,0.8)",
  },
  detailTextDistance: {
    fontSize: 14,
    color: "rgba(255,255,255,0.65)",
  },
  expectationsContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 4,
    backgroundColor: "rgba(255,255,255,0.2)",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    alignSelf: "flex-start",
    borderWidth: 1,
    borderColor: "rgba(100, 200, 255, 0.4)",
  },
  expectationsText: {
    fontSize: 12,
    color: "#fff",
    fontWeight: "600",
  },
});

export default SwipeCard;
