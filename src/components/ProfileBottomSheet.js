import React, { useRef, useEffect } from 'react';
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
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, FontAwesome5, MaterialCommunityIcons } from '@expo/vector-icons';
import GlassCard from './GlassCard';
import theme from '../theme/theme';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const ProfileBottomSheet = ({ visible, profile, onClose, onLike, onPass, onSuperLike }) => {
  const slideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const panY = useRef(new Animated.Value(0)).current;

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        // Only respond to vertical drags
        return Math.abs(gestureState.dy) > Math.abs(gestureState.dx);
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

  const renderBadge = (type) => {
    if (type === 'verified' && profile.isVerified) {
      return (
        <View style={[styles.badge, { backgroundColor: '#4CAF50' }]}>
          <MaterialCommunityIcons name="check-decagram" size={14} color="#fff" />
          <Text style={styles.badgeText}>Verified</Text>
        </View>
      );
    }
    if (type === 'premium' && profile.isPremium) {
      return (
        <View style={[styles.badge, { backgroundColor: '#FFD700' }]}>
          <MaterialCommunityIcons name="crown" size={14} color="#000" />
          <Text style={[styles.badgeText, { color: '#000' }]}>Premium</Text>
        </View>
      );
    }
    return null;
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
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={handleClose} />
        
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

          <ScrollView showsVerticalScrollIndicator={false} style={styles.scrollView}>
            {/* Photo Gallery */}
            <View style={styles.photoGalleryContainer}>
              <ScrollView
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                style={styles.photoGallery}
                contentContainerStyle={styles.photoGalleryContent}
              >
                {(profile.photos && profile.photos.length > 0 ? profile.photos : [profile.image]).map((photo, index) => (
                  <View key={index} style={styles.photoWrapper}>
                    <Image
                      source={{ uri: photo || 'https://via.placeholder.com/400x600' }}
                      style={styles.photo}
                    />
                  </View>
                ))}
              </ScrollView>
              
              {/* Photo Indicators */}
              {profile.photos && profile.photos.length > 1 && (
                <View style={styles.photoIndicators}>
                  {profile.photos.map((_, index) => (
                    <View key={index} style={[styles.indicator, index === 0 && styles.activeIndicator]} />
                  ))}
                </View>
              )}
            </View>

            {/* Profile Info */}
            <View style={styles.content}>
              <View style={styles.header}>
                <View style={styles.nameRow}>
                  <Text style={styles.name}>
                    {profile.name || profile.displayName}, {profile.age}
                  </Text>
                  <View style={styles.badgesRow}>
                    {renderBadge('verified')}
                    {renderBadge('premium')}
                  </View>
                </View>
                
                {profile.location && (
                  <View style={styles.locationRow}>
                    <Ionicons name="location" size={16} color={theme.colors.text.secondary} />
                    <Text style={styles.location}>{profile.location}</Text>
                    {profile.distance && (
                      <Text style={styles.distance}> • {profile.distance} km away</Text>
                    )}
                  </View>
                )}
              </View>

              {/* Bio */}
              {profile.bio && (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>About</Text>
                  <GlassCard style={styles.card} opacity={0.1}>
                    <Text style={styles.bioText}>{profile.bio}</Text>
                  </GlassCard>
                </View>
              )}

              {/* Quick Stats */}
              <View style={styles.statsRow}>
                {profile.occupation && (
                  <GlassCard style={styles.statCard} opacity={0.1}>
                    <FontAwesome5 name="briefcase" size={16} color={theme.colors.text.secondary} />
                    <Text style={styles.statText}>{profile.occupation}</Text>
                  </GlassCard>
                )}
                {profile.height && (
                  <GlassCard style={styles.statCard} opacity={0.1}>
                    <FontAwesome5 name="ruler-vertical" size={16} color={theme.colors.text.secondary} />
                    <Text style={styles.statText}>{profile.height} cm</Text>
                  </GlassCard>
                )}
                {profile.education && (
                  <GlassCard style={styles.statCard} opacity={0.1}>
                    <FontAwesome5 name="graduation-cap" size={16} color={theme.colors.text.secondary} />
                    <Text style={styles.statText}>{profile.education}</Text>
                  </GlassCard>
                )}
              </View>

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

              {/* Lifestyle */}
              {(profile.drinking || profile.smoking || profile.drugs) && (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Lifestyle</Text>
                  <View style={styles.lifestyleGrid}>
                    {profile.drinking && (
                      <GlassCard style={styles.lifestyleItem} opacity={0.1}>
                        <FontAwesome5 name="wine-glass-alt" size={16} color={theme.colors.text.secondary} />
                        <Text style={styles.lifestyleText}>Drinks: {profile.drinking}</Text>
                      </GlassCard>
                    )}
                    {profile.smoking && (
                      <GlassCard style={styles.lifestyleItem} opacity={0.1}>
                        <FontAwesome5 name="smoking" size={16} color={theme.colors.text.secondary} />
                        <Text style={styles.lifestyleText}>Smokes: {profile.smoking}</Text>
                      </GlassCard>
                    )}
                    {profile.drugs && (
                      <GlassCard style={styles.lifestyleItem} opacity={0.1}>
                        <FontAwesome5 name="cannabis" size={16} color={theme.colors.text.secondary} />
                        <Text style={styles.lifestyleText}>Weed: {profile.drugs}</Text>
                      </GlassCard>
                    )}
                  </View>
                </View>
              )}

              {/* Looking For */}
              {profile.relationshipExpectations && (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Looking For</Text>
                  <GlassCard style={styles.card} opacity={0.1}>
                    <Text style={styles.bioText}>{profile.relationshipExpectations}</Text>
                  </GlassCard>
                </View>
              )}

              <View style={{ height: 120 }} />
            </View>
          </ScrollView>

          {/* Action Buttons */}
          <View style={styles.actionBar}>
            <TouchableOpacity style={styles.actionButton} onPress={onPass}>
              <View style={[styles.actionButtonCircle, styles.passButton]}>
                <Ionicons name="close" size={32} color="#000" />
              </View>
            </TouchableOpacity>

            <TouchableOpacity style={[styles.actionButton, styles.superLikeButton]} onPress={onSuperLike}>
              <View style={[styles.actionButtonCircle, styles.superLikeCircle]}>
                <Ionicons name="star" size={28} color="#D4AF37" />
              </View>
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionButton} onPress={onLike}>
              <View style={[styles.actionButtonCircle, styles.likeButton]}>
                <Ionicons name="heart" size={32} color="#FFF" />
              </View>
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
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  backdrop: {
    flex: 1,
  },
  bottomSheet: {
    position: 'absolute',
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
    alignItems: 'center',
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
  photoGalleryContainer: {
    paddingHorizontal: 20,
    paddingTop: 10,
    marginBottom: 20,
  },
  photoGallery: {
    height: 450,
  },
  photoGalleryContent: {
    gap: 12,
  },
  photoWrapper: {
    width: SCREEN_WIDTH - 40,
    height: 450,
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: '#f0f0f0',
    ...theme.shadows.lg,
  },
  photo: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  photoIndicators: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
    marginTop: 12,
  },
  indicator: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: theme.colors.text.tertiary,
    opacity: 0.3,
  },
  activeIndicator: {
    backgroundColor: theme.colors.primary,
    opacity: 1,
    width: 20,
  },
  content: {
    padding: 20,
  },
  header: {
    marginBottom: 20,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  name: {
    fontSize: 28,
    fontWeight: 'bold',
    color: theme.colors.text.primary,
  },
  badgesRow: {
    flexDirection: 'row',
    gap: 8,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#fff',
    textTransform: 'uppercase',
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  location: {
    fontSize: 14,
    color: theme.colors.text.secondary,
  },
  distance: {
    fontSize: 14,
    color: theme.colors.text.tertiary,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.text.primary,
    marginBottom: 12,
  },
  card: {
    padding: 16,
  },
  bioText: {
    fontSize: 15,
    color: theme.colors.text.secondary,
    lineHeight: 24,
  },
  statsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 24,
  },
  statCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  statText: {
    fontSize: 14,
    color: theme.colors.text.primary,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  tag: {
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
  },
  tagText: {
    color: theme.colors.text.primary,
    fontSize: 14,
  },
  lifestyleGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  lifestyleItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    minWidth: '45%',
  },
  lifestyleText: {
    fontSize: 14,
    color: theme.colors.text.primary,
  },
  actionBar: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 20,
    paddingVertical: 20,
    paddingHorizontal: 40,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#F2F2F7',
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
    width: '100%',
    height: '100%',
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  },
  passButton: {
    backgroundColor: '#F5F5F5',
    borderWidth: 2,
    borderColor: '#E5E5EA',
  },
  superLikeCircle: {
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#D4AF37',
    borderRadius: 28,
  },
  likeButton: {
    backgroundColor: '#000000',
  },
});

export default ProfileBottomSheet;
