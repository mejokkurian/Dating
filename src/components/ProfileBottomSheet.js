import React, { useRef, useEffect } from "react";
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
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import {
  Ionicons,
  FontAwesome5,
  MaterialCommunityIcons,
} from "@expo/vector-icons";
import GlassCard from "./GlassCard";
import theme from "../theme/theme";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

const ProfileBottomSheet = ({
  visible,
  profile,
  onClose,
  onLike,
  onPass,
  onSuperLike,
}) => {
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

  // Organize photos: primary first, then others
  const organizePhotos = () => {
    if (!profile.photos || profile.photos.length === 0) {
      return [];
    }
    const mainIndex = profile.mainPhotoIndex ?? 0;
    const primaryPhoto = profile.photos[mainIndex] || profile.photos[0];
    const otherPhotos = profile.photos.filter(
      (_, index) => index !== mainIndex
    );
    return [primaryPhoto, ...otherPhotos];
  };

  const organizedPhotos = organizePhotos();

  // Render full-width embedded photo
  const renderFullWidthPhoto = (photoUri, index) => (
    <View key={`photo-${index}`} style={styles.embeddedPhotoContainer}>
      <Image
        source={{ uri: photoUri || "https://via.placeholder.com/400x600" }}
        style={styles.embeddedPhoto}
      />
    </View>
  );

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
            {/* Primary Photo */}
            {organizedPhotos.length > 0 &&
              renderFullWidthPhoto(organizedPhotos[0], 0)}

            {/* Profile Info */}
            <View style={styles.content}>
              {/* Bio */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>About</Text>
                <Text style={styles.bioTextPlain}>
                  {profile.bio || "No bio available"}
                </Text>
              </View>

              {/* Photo 2 */}
              {organizedPhotos.length > 1 &&
                renderFullWidthPhoto(organizedPhotos[1], 1)}

              {/* Quick Stats */}
              <View style={styles.statsRow}>
                {profile.occupation && (
                  <GlassCard style={styles.statCard} opacity={0.1}>
                    <FontAwesome5
                      name="briefcase"
                      size={16}
                      color={theme.colors.text.secondary}
                    />
                    <Text style={styles.statText}>{profile.occupation}</Text>
                  </GlassCard>
                )}
                {profile.height && (
                  <GlassCard style={styles.statCard} opacity={0.1}>
                    <FontAwesome5
                      name="ruler-vertical"
                      size={16}
                      color={theme.colors.text.secondary}
                    />
                    <Text style={styles.statText}>{profile.height} cm</Text>
                  </GlassCard>
                )}
                {profile.education && (
                  <GlassCard style={styles.statCard} opacity={0.1}>
                    <FontAwesome5
                      name="graduation-cap"
                      size={16}
                      color={theme.colors.text.secondary}
                    />
                    <Text style={styles.statText}>{profile.education}</Text>
                  </GlassCard>
                )}
              </View>

              {/* Photo 3 */}
              {organizedPhotos.length > 2 &&
                renderFullWidthPhoto(organizedPhotos[2], 2)}

              {/* Interests */}
              {profile.interests && profile.interests.length > 0 && (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Interests</Text>
                  <View style={styles.tagsContainer}>
                    {profile.interests.map((interest, index) => (
                      <GlassCard key={index} style={styles.tag} opacity={0.1}>
                        <Text style={styles.tagText}>{interest}</Text>
                      </GlassCard>
                    ))}
                  </View>
                </View>
              )}

              {/* Photo 4 */}
              {organizedPhotos.length > 3 &&
                renderFullWidthPhoto(organizedPhotos[3], 3)}

              {/* Lifestyle */}
              {(profile.drinking || profile.smoking || profile.drugs) && (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Lifestyle</Text>
                  <View style={styles.lifestyleGrid}>
                    {profile.drinking && (
                      <GlassCard style={styles.lifestyleItem} opacity={0.1}>
                        <FontAwesome5
                          name="wine-glass-alt"
                          size={16}
                          color={theme.colors.text.secondary}
                        />
                        <Text style={styles.lifestyleText}>
                          Drinks: {profile.drinking}
                        </Text>
                      </GlassCard>
                    )}
                    {profile.smoking && (
                      <GlassCard style={styles.lifestyleItem} opacity={0.1}>
                        <FontAwesome5
                          name="smoking"
                          size={16}
                          color={theme.colors.text.secondary}
                        />
                        <Text style={styles.lifestyleText}>
                          Smokes: {profile.smoking}
                        </Text>
                      </GlassCard>
                    )}
                    {profile.drugs && (
                      <GlassCard style={styles.lifestyleItem} opacity={0.1}>
                        <FontAwesome5
                          name="cannabis"
                          size={16}
                          color={theme.colors.text.secondary}
                        />
                        <Text style={styles.lifestyleText}>
                          Weed: {profile.drugs}
                        </Text>
                      </GlassCard>
                    )}
                  </View>
                </View>
              )}

              {/* Photo 5+ (remaining photos after Lifestyle) */}
              {organizedPhotos
                .slice(4)
                .map((photo, index) => renderFullWidthPhoto(photo, index + 4))}

              {/* Looking For */}
              {profile.relationshipExpectations && (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Looking For</Text>
                  <Text style={styles.bioTextPlain}>
                    {profile.relationshipExpectations}
                  </Text>
                </View>
              )}

              <View style={{ height: 200 }} />
            </View>
          </ScrollView>

          {/* Action Buttons */}
          <View style={styles.actionBar}>
            <TouchableOpacity style={styles.actionButton} onPress={onPass}>
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
                if (onLike) {
                  onLike(profile);
                }
              }}
              onPressIn={() => {
                // Heart feedback animation - Powerful Pop!
                heartScale.setValue(0.5);
                heartOpacity.setValue(0);
                heartTranslateY.setValue(0);

                Animated.parallel([
                  Animated.spring(heartScale, {
                    toValue: 1.5,
                    friction: 3, // Bouncy
                    tension: 80,
                    useNativeDriver: true,
                  }),
                  Animated.timing(heartOpacity, {
                     toValue: 1,
                     duration: 50,
                     useNativeDriver: true
                  }),
                  Animated.timing(heartTranslateY, {
                    toValue: -80, // Float higher
                    duration: 500,
                    useNativeDriver: true,
                  }),
                  Animated.sequence([
                      Animated.delay(250),
                      Animated.timing(heartOpacity, {
                          toValue: 0,
                          duration: 300,
                          useNativeDriver: true,
                      })
                  ])
                ]).start();
              }}
            >
              <View style={[styles.actionButtonCircle, styles.likeButton]}>
                <Ionicons name="heart" size={32} color="#FFF" />
              </View>
              {/* Heart Feedback Icon */}
              <Animated.View
                style={[
                  styles.buttonFeedback,
                  {
                    opacity: heartOpacity,
                    transform: [
                      { scale: heartScale },
                      { translateY: heartTranslateY },
                    ],
                  },
                ]}
                pointerEvents="none"
              >
                <Ionicons name="heart" size={60} color="#FF1744" 
                    style={{ 
                        shadowColor: '#FF1744', 
                        shadowOpacity: 0.5, 
                        shadowRadius: 15,
                        textShadowColor: '#FF1744',
                        textShadowRadius: 10
                    }}
                />
              </Animated.View>
            </TouchableOpacity>
          </View>
        </Animated.View>
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
  statsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 28,
  },
  statCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "rgba(0,0,0,0.03)",
    borderRadius: 12,
  },
  statText: {
    fontSize: 15,
    color: theme.colors.text.primary,
    fontWeight: "500",
  },
  tagsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  tag: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 24,
    backgroundColor: "rgba(0,0,0,0.04)",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.06)",
  },
  tagText: {
    color: theme.colors.text.primary,
    fontSize: 15,
    fontWeight: "500",
  },
  lifestyleGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  lifestyleItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    minWidth: "45%",
    backgroundColor: "rgba(0,0,0,0.03)",
    borderRadius: 12,
  },
  lifestyleText: {
    fontSize: 15,
    color: theme.colors.text.primary,
    fontWeight: "500",
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
    backgroundColor: "#000000",
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
});

export default ProfileBottomSheet;
