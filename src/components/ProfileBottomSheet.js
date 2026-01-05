import React, { useRef, useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  Dimensions,
  Animated,
  Modal,
  PanResponder,
  Easing,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import {
  Ionicons,
  FontAwesome5,
  MaterialCommunityIcons,
} from "@expo/vector-icons";
import theme from "../theme/theme";
import { getInterestIcon } from "../constants/interestIcons";
import { useProfileAnimations } from "../hooks/useProfileAnimations";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

import CoachmarkOverlay from "./CoachmarkOverlay"; 
import ProfileContent from "./ProfileContent";

// ...

const ProfileBottomSheet = ({
  visible,
  profile,
  onClose,
  onLike,
  onPass,
  onSuperLike,
  showTutorial, // New Prop
  tutorialStep, // New Prop
  onTutorialNext // New Prop
}) => {
  // ... existing hooks ...


  const slideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const panY = useRef(new Animated.Value(0)).current;

  // Heart button feedback animation
  const heartScale = useRef(new Animated.Value(1)).current;
  const heartOpacity = useRef(new Animated.Value(0)).current;
  const heartTranslateY = useRef(new Animated.Value(0)).current;

  // Super like button feedback animation
  const superLikeScale = useRef(new Animated.Value(1)).current;
  const superLikeOpacity = useRef(new Animated.Value(0)).current;
  const superLikeTranslateY = useRef(new Animated.Value(0)).current;
  
  // Use reusable animation hook
  const {
    showPassAnimation,
    isPassLoading,
    passIconScale,
    passOverlayOpacity,
    passSpinnerRotate,
    showLikeAnimation,
    likeHeartScale,
    likeParticleOpacity,
    particles,
    triggerPassAnimation,
    triggerLikeAnimation,
    resetAnimations
  } = useProfileAnimations();

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        // Only respond to vertical drags down from the top area
        // This prevents interference with action buttons at the bottom
        const isVerticalDrag =
          Math.abs(gestureState.dy) > Math.abs(gestureState.dx);
        const isDraggingDown = gestureState.dy > 0;
        return isVerticalDrag && isDraggingDown;
      },
      onPanResponderMove: (_, gestureState) => {
        // Only allow dragging down
        if (gestureState.dy > 0) {
          panY.setValue(gestureState.dy);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dy > 150) {
          // Close if dragged down more than 150px
          handleClose();
        } else {
          // Snap back
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
      // Reset feedback animations to ensure no ghost icons
      heartScale.setValue(0.5);
      heartOpacity.setValue(0);
      heartTranslateY.setValue(0);
      
      superLikeScale.setValue(0.8);
      superLikeOpacity.setValue(0);
      superLikeTranslateY.setValue(0);
      
      // Reset animations using hook
      resetAnimations();

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

  if (!profile) return null;



  // Handle Pass with Animation
  const handlePassPress = () => {
    triggerPassAnimation(() => {
        if (onPass) onPass();
    });
  };

  const combinedTranslateY = Animated.add(slideAnim, panY);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={handleClose}
    >
      <View style={styles.overlay}>
        <TouchableOpacity
          style={styles.backdrop}
          activeOpacity={1}
          onPress={handleClose}
        />

        <Animated.View
          style={[
            styles.bottomSheet,
            { transform: [{ translateY: combinedTranslateY }] },
          ]}
        >
          {/* Drag Handle */}
          <View {...panResponder.panHandlers} style={styles.handleContainer}>
            <View style={styles.handle} />
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
          >
            <ProfileContent profile={profile} />
          </ScrollView>

          {/* Action Buttons */}
          <View style={styles.actionBar}>
            <TouchableOpacity style={styles.actionButton} onPress={handlePassPress}>
              <View style={[styles.actionButtonCircle, styles.passButton]}>
                <Ionicons name="close" size={32} color="#000" />
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionButton, styles.superLikeButton]}
              onPress={() => {
                 onSuperLike();
              }}
            >
              <View style={[styles.actionButtonCircle, styles.superLikeCircle]}>
                <Ionicons name="star" size={28} color="#D4AF37" />
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => {
                // Heartfullness Animation via Hook
                triggerLikeAnimation(() => {
                    if (onLike) onLike(profile);
                });
              }}
              activeOpacity={0.8}
            >
              <View style={[styles.actionButtonCircle, styles.likeButton]}>
                <Ionicons name="heart" size={32} color="#FFF" />
              </View>
            </TouchableOpacity>
          </View>
          

        </Animated.View>

        {/* Pass Animation Overlay */}
        {showPassAnimation && (
          <Animated.View
            style={[
              styles.passAnimationOverlay,
              {
                opacity: passOverlayOpacity,
              },
            ]}
          >
            <Animated.View
              style={{
                transform: [
                  { scale: passIconScale },
                ],
              }}
            >
              <View style={styles.passAnimationIcon}>
                <Ionicons name="close" size={32} color="#000" />
                {isPassLoading && (
                  <Animated.View
                    style={{
                      position: 'absolute',
                      transform: [
                        {
                          rotate: passSpinnerRotate.interpolate({
                            inputRange: [0, 1],
                            outputRange: ['0deg', '360deg'],
                          }),
                        },
                      ],
                    }}
                  >
                    <Ionicons name="sync-outline" size={56} color="#666" />
                  </Animated.View>
                )}
              </View>
            </Animated.View>
          </Animated.View>
        )}
        {/* Like Animation Overlay (Heartfullness) */}
        {showLikeAnimation && (
          <View style={styles.likeAnimationOverlay} pointerEvents="none">
             {/* Particles */}
             {particles.map((p) => (
               <Animated.View
                 key={p.id}
                 style={[
                   styles.likeParticle,
                   {
                     opacity: Animated.multiply(likeParticleOpacity, p.opacity),
                     transform: [
                       { translateX: p.x },
                       { translateY: p.y },
                       { scale: p.scale }
                     ]
                   }
                 ]}
               >
                 <Ionicons name="heart" size={24} color="#FF3B30" />
               </Animated.View>
             ))}

             {/* Main Heart */}
             <Animated.View
               style={[
                 styles.likeMainHeart,
                 {
                   transform: [{ scale: likeHeartScale }]
                 }
               ]}
             >
                <Ionicons name="heart" size={120} color="#FF3B30" style={styles.mainHeartShadow} />
             </Animated.View>
          </View>
        )}

        {/* Internal Coachmark Overlay (Step 1) */}
        {showTutorial && tutorialStep === 1 && (
            <CoachmarkOverlay
                visible={true}
                step={0} 
                steps={[{
                    title: "Make Your Move",
                    message: "Tap the buttons to Pass, Super Like, or Match.",
                    icons: ["close", "star", "heart"], // Show all 3 actions
                    position: "bottom-sheet"
                }]}
                onNext={onTutorialNext}
                onComplete={onTutorialNext}
            />
        )}
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  backdrop: {
    flex: 1,
  },
  bottomSheet: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: SCREEN_HEIGHT * 0.9,
    backgroundColor: theme.colors.background,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    ...theme.shadows.xl,
  },
  handleContainer: {
    alignItems: "center",
    paddingVertical: 12,
  },
  handle: {
    width: 40,
    height: 5,
    backgroundColor: theme.colors.text.tertiary,
    borderRadius: 3,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 200,
  },
  embeddedPhotoContainer: {
    width: "100%",
    marginVertical: 20,
    paddingHorizontal: 16,
  },
  embeddedPhoto: {
    width: "100%",
    height: 480,
    resizeMode: "cover",
    backgroundColor: "#f0f0f0",
    borderRadius: 24,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.05)",
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: theme.colors.text.primary,
    marginBottom: 16,
    letterSpacing: -0.5,
  },
  bioText: {
    fontSize: 16,
    color: theme.colors.text.secondary,
    lineHeight: 26,
    letterSpacing: 0.2,
  },
  bioTextPlain: {
    fontSize: 16,
    color: theme.colors.text.secondary,
    lineHeight: 26,
    marginTop: 4,
    letterSpacing: 0.2,
  },
  statsGridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  statRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '48%',
    gap: 10,
  },
  statIcon: {
    width: 20,
  },
  interestsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  interestItemWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '48%',
    gap: 10,
  },
  interestIcon: {
    width: 20,
  },
  lifestyleTextContainer: {
    gap: 12,
  },
  lifestyleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  lifestyleIcon: {
    width: 20,
  },
  actionBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 20,
    paddingVertical: 20,
    paddingHorizontal: 40,
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#F2F2F7",
    zIndex: 100,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 10,
  },
  actionButton: {
    width: 64,
    height: 64,
  },
  superLikeButton: {
    width: 56,
    height: 56,
  },
  actionButtonCircle: {
    width: "100%",
    height: "100%",
    borderRadius: 32,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  },
  passButton: {
    backgroundColor: "#F5F5F5",
    borderWidth: 2,
    borderColor: "#E5E5EA",
  },
  superLikeCircle: {
    backgroundColor: "#FFFFFF",
    borderWidth: 2,
    borderColor: "#D4AF37",
    borderRadius: 28,
  },
  likeButton: {
    backgroundColor: '#D4AF37',
    shadowColor: '#D4AF37',
  },
  buttonFeedback: {
    position: "absolute",
    top: -30,
    left: "50%",
    marginLeft: -25,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 10,
  },
  passAnimationOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9999,
    elevation: 9999,
  },
  passAnimationIcon: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
  likeAnimationOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9999,
    elevation: 9999,
  },
  likeMainHeart: {
    shadowColor: "#FF3B30",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 20,
    elevation: 15,
  },
  mainHeartShadow: {
    textShadowColor: 'rgba(255, 59, 48, 0.5)',
    textShadowOffset: { width: 0, height: 4 },
    textShadowRadius: 10,
  },
  likeParticle: {
    position: 'absolute',
  },
});

export default ProfileBottomSheet;
