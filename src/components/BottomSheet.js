import React, { useRef, useEffect } from "react";
import {
  View,
  StyleSheet,
  Modal,
  Animated,
  PanResponder,
  TouchableOpacity,
  Dimensions,
  Platform,
} from "react-native";
import theme from "../theme/theme";
import { BlurView } from 'expo-blur';

const { height: SCREEN_HEIGHT } = Dimensions.get("window");

const BottomSheet = ({
  visible,
  onClose,
  children,
  height = SCREEN_HEIGHT * 0.9,
  backgroundColor = theme.colors.background,
}) => {
  const slideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const panY = useRef(new Animated.Value(0)).current;

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        const isVerticalDrag = Math.abs(gestureState.dy) > Math.abs(gestureState.dx);
        const isDraggingDown = gestureState.dy > 0;
        return isVerticalDrag && isDraggingDown;
      },
      onPanResponderMove: (_, gestureState) => {
        if (gestureState.dy > 0) {
          panY.setValue(gestureState.dy);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dy > 100) {
          handleClose();
        } else {
          Animated.spring(panY, {
            toValue: 0,
            useNativeDriver: true,
            friction: 7,
          }).start();
        }
      },
    })
  ).current;

  useEffect(() => {
    if (visible) {
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 50,
        friction: 8,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(slideAnim, {
        toValue: SCREEN_HEIGHT,
        duration: 250,
        useNativeDriver: true,
      }).start();
    }
  }, [visible]);

  const handleClose = () => {
    Animated.timing(slideAnim, {
      toValue: SCREEN_HEIGHT,
      duration: 250,
      useNativeDriver: true,
    }).start(() => {
      panY.setValue(0);
      onClose();
    });
  };

  const combinedTranslateY = Animated.add(slideAnim, panY);

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={handleClose}
    >
      <View style={styles.overlay}>
         {/* Backdrop Blur - consistent with other sheets */}
         <BlurView intensity={20} tint="dark" style={StyleSheet.absoluteFill} />

        <TouchableOpacity
          style={styles.backdrop}
          activeOpacity={1}
          onPress={handleClose}
        />

        <Animated.View
          style={[
            styles.bottomSheet,
            { 
              height, 
              backgroundColor,
              transform: [{ translateY: combinedTranslateY }] 
            },
          ]}
        >
          <View {...panResponder.panHandlers} style={styles.handleContainer}>
            <View style={styles.handle} />
          </View>
          
          <View style={styles.content}>
            {children}
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "flex-end",
  },
  backdrop: {
    flex: 1,
  },
  bottomSheet: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    ...theme.shadows.xl,
    // Add extra padding at bottom for iOS home indicator
    paddingBottom: Platform.OS === 'ios' ? 34 : 0, 
  },
  handleContainer: {
    alignItems: "center",
    paddingVertical: 12,
  },
  handle: {
    width: 40,
    height: 5,
    backgroundColor: '#E5E5E5', // Consistent handle color
    borderRadius: 3,
  },
  content: {
    flex: 1,
  }
});

export default BottomSheet;
