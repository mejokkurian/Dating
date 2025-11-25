import React, { useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  Animated,
  PanResponder,
  Image,
  TouchableOpacity,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import theme from '../theme/theme';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const SWIPE_THRESHOLD = 120;

const SwipeCard = ({ data, onSwipeLeft, onSwipeRight, onCardPress, onDoubleTap }) => {
  const position = useRef(new Animated.ValueXY()).current;
  const lastTap = useRef(null);
  
  const rotate = position.x.interpolate({
    inputRange: [-SCREEN_WIDTH / 2, 0, SCREEN_WIDTH / 2],
    outputRange: ['-10deg', '0deg', '10deg'],
    extrapolate: 'clamp',
  });

  const likeOpacity = position.x.interpolate({
    inputRange: [0, SWIPE_THRESHOLD],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });

  const nopeOpacity = position.x.interpolate({
    inputRange: [-SWIPE_THRESHOLD, 0],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  });

  const handleDoubleTap = () => {
    const now = Date.now();
    const DOUBLE_TAP_DELAY = 300; // milliseconds
    
    if (lastTap.current && (now - lastTap.current) < DOUBLE_TAP_DELAY) {
      // Double tap detected
      lastTap.current = null;
      onDoubleTap && onDoubleTap(data);
    } else {
      // Single tap
      lastTap.current = now;
      // Wait to see if there's a second tap
      setTimeout(() => {
        if (lastTap.current === now) {
          // No second tap, treat as single tap
          onCardPress && onCardPress(data);
          lastTap.current = null;
        }
      }, DOUBLE_TAP_DELAY);
    }
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        // Only respond to swipes (horizontal movement)
        return Math.abs(gestureState.dx) > 10;
      },
      onPanResponderMove: (_, gesture) => {
        position.setValue({ x: gesture.dx, y: gesture.dy });
      },
      onPanResponderRelease: (_, gesture) => {
        // Check if it's a tap (minimal movement)
        if (Math.abs(gesture.dx) < 10 && Math.abs(gesture.dy) < 10) {
          // It's a tap, check for double tap
          handleDoubleTap();
          return;
        }

        if (gesture.dx > SWIPE_THRESHOLD) {
          // Swipe Right - Like
          forceSwipe('right');
        } else if (gesture.dx < -SWIPE_THRESHOLD) {
          // Swipe Left - Pass
          forceSwipe('left');
        } else {
          // Return to center
          resetPosition();
        }
      },
    })
  ).current;

  const forceSwipe = (direction) => {
    const x = direction === 'right' ? SCREEN_WIDTH + 100 : -SCREEN_WIDTH - 100;
    Animated.timing(position, {
      toValue: { x, y: 0 },
      duration: 250,
      useNativeDriver: false,
    }).start(() => {
      // Reset position first
      position.setValue({ x: 0, y: 0 });
      
      // Then trigger callback
      if (direction === 'right') {
        onSwipeRight && onSwipeRight(data);
      } else {
        onSwipeLeft && onSwipeLeft(data);
      }
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
    transform: [{ rotate }],
  };
  console.log(data.photos?.[0]);

  return (
    <Animated.View style={[styles.card, cardStyle]} {...panResponder.panHandlers}>
      <Image
        source={{
          uri: data.photos?.[0]|| 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=500',
        }}
        style={styles.cardImage}
      />
      
      {/* Gradient Overlay */}
      <LinearGradient
        colors={['transparent', 'rgba(0,0,0,0.8)']}
        style={styles.gradient}
      />

      {/* Like Stamp */}
      <Animated.View style={[styles.likeStamp, { opacity: likeOpacity }]}>
        <Text style={styles.stampText}>LIKE</Text>
      </Animated.View>

      {/* Nope Stamp */}
      <Animated.View style={[styles.nopeStamp, { opacity: nopeOpacity }]}>
        <Text style={styles.stampText}>NOPE</Text>
      </Animated.View>

      {/* Card Info */}
      <View style={styles.cardInfo}>
        <View style={styles.nameRow}>
          <Text style={styles.name}>
            {data.name || data.displayName}, {data.age}
          </Text>
          {data.isVerified && (
            <MaterialCommunityIcons name="check-decagram" size={24} color="#4CAF50" />
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
          {data.distance && (
            <View style={styles.detailItem}>
              <Ionicons name="location" size={16} color="#fff" />
              <Text style={styles.detailText}>{data.distance} km away</Text>
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
    backgroundColor: '#fff',
    overflow: 'hidden',
    ...theme.shadows.xl,
  },
  cardImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  gradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '50%',
  },
  likeStamp: {
    position: 'absolute',
    top: 50,
    left: 40,
    borderWidth: 4,
    borderColor: '#4CAF50',
    borderRadius: 10,
    padding: 10,
    transform: [{ rotate: '-20deg' }],
  },
  nopeStamp: {
    position: 'absolute',
    top: 50,
    right: 40,
    borderWidth: 4,
    borderColor: '#F44336',
    borderRadius: 10,
    padding: 10,
    transform: [{ rotate: '20deg' }],
  },
  stampText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
    letterSpacing: 2,
  },
  cardInfo: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 20,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  name: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
  },
  bio: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.9)',
    marginBottom: 12,
    lineHeight: 22,
  },
  detailsRow: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 12,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  detailText: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.9)',
  },
  expectationsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  expectationsText: {
    fontSize: 12,
    color: '#fff',
    fontWeight: '600',
  },
});

export default SwipeCard;
