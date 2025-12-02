import React, { useRef } from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import { Ionicons } from '@expo/vector-icons';

const SwipeableMessage = ({ children, onReply, isMine, onSwipeableOpen }) => {
  const swipeableRef = useRef(null);

  const renderRightActions = (progress, dragX) => {
    const scale = dragX.interpolate({
      inputRange: [-80, 0],
      outputRange: [1, 0],
      extrapolate: 'clamp',
    });

    return (
      <View style={styles.replyActionContainer}>
        <Animated.View style={[styles.replyActionIcon, { transform: [{ scale }] }]}>
          <Ionicons name="arrow-undo" size={24} color="#007AFF" />
        </Animated.View>
      </View>
    );
  };

  const handleReply = () => {
    if (onReply) {
      onReply();
      // Close the swipeable after triggering reply
      if (swipeableRef.current) {
        swipeableRef.current.close();
      }
    }
  };

  // If onReply is not provided, disable swiping
  if (!onReply) {
    return (
      <View style={{ width: '100%', alignItems: isMine ? 'flex-end' : 'flex-start', paddingHorizontal: 16 }}>
        {children}
      </View>
    );
  }

  return (
    <Swipeable
      ref={swipeableRef}
      renderRightActions={renderRightActions}
      onSwipeableOpen={handleReply}
      onSwipeableWillOpen={() => onSwipeableOpen && onSwipeableOpen(swipeableRef.current)}
      friction={2}
      rightThreshold={40}
      containerStyle={styles.swipeableContainer}
    >
      <View style={{ width: '100%', alignItems: isMine ? 'flex-end' : 'flex-start', paddingHorizontal: 16 }}>
        {children}
      </View>
    </Swipeable>
  );
};

const styles = StyleSheet.create({
  swipeableContainer: {
    overflow: 'visible',
  },
  replyActionContainer: {
    justifyContent: 'center',
    alignItems: 'flex-end',
    paddingRight: 20,
  },
  replyActionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F0F0F0',
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default SwipeableMessage;
