import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  ScrollView,
  TouchableOpacity,
  Animated,
  useWindowDimensions,
  Easing,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, FontAwesome5, MaterialCommunityIcons } from '@expo/vector-icons';
import api from '../services/api/config';
import theme from '../theme/theme';
import { INTEREST_ICONS, DEFAULT_INTEREST_ICON, getInterestIcon } from '../constants/interestIcons';
import CustomAlert from '../components/CustomAlert';
import { useCustomAlert } from '../hooks/useCustomAlert';

import { recordInteraction } from '../services/api/match';

const LikeProfileScreen = ({ route, navigation }) => {
  const { user, matchId, fromConnectNow } = route.params;
  const [loading, setLoading] = useState(false);
  const [showPassAnimation, setShowPassAnimation] = useState(false);
  const { width, height } = useWindowDimensions();
  const { alertConfig, showAlert, hideAlert, handleConfirm } = useCustomAlert();
  
  // Animated heart for loading state
  const heartScale = useRef(new Animated.Value(1)).current;
  const heartRotate = useRef(new Animated.Value(0)).current;
  const heartPump = useRef(new Animated.Value(1)).current;
  
  // Pass button animation
  const passIconScale = useRef(new Animated.Value(1)).current;
  const passIconX = useRef(new Animated.Value(0)).current;
  const passIconY = useRef(new Animated.Value(0)).current;
  const passOverlayOpacity = useRef(new Animated.Value(0)).current;
  const passSpinnerRotate = useRef(new Animated.Value(0)).current;

  // Continuous pumping animation when not loading
  useEffect(() => {
    if (!loading) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(heartPump, {
            toValue: 1.1,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(heartPump, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      heartPump.setValue(1);
    }
  }, [loading]);

  useEffect(() => {
    if (loading) {
      Animated.loop(
        Animated.parallel([
          Animated.sequence([
            Animated.timing(heartScale, {
              toValue: 1.2,
              duration: 400,
              useNativeDriver: true,
            }),
            Animated.timing(heartScale, {
              toValue: 1,
              duration: 400,
              useNativeDriver: true,
            }),
          ]),
          Animated.timing(heartRotate, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      heartScale.setValue(1);
      heartRotate.setValue(0);
    }
  }, [loading]);

  const photos = user.photos || [];
  const hasPhotos = photos.length > 0;

  // Organize photos: primary first, then others
  const organizePhotos = () => {
    if (!photos || photos.length === 0) {
      return [];
    }
    const mainIndex = user.mainPhotoIndex ?? 0;
    const primaryPhoto = photos[mainIndex] || photos[0];
    const otherPhotos = photos.filter((_, index) => index !== mainIndex);
    return [primaryPhoto, ...otherPhotos];
  };

  const organizedPhotos = organizePhotos();

  const handleMatch = async () => {
    try {
      setLoading(true);
      
      if (matchId) {
        // Handle explicit match response (e.g. from LikesYou)
        await api.post(`/matches/${matchId}/respond`, {
          action: 'accept',
        });
      } else {
        // Handle generic interaction (e.g. from ConnectNow)
        await recordInteraction(user._id || user.id, 'LIKE');
      }

      setLoading(false);
      showAlert(
        "It's a Match!",
        `You and ${user.name || user.displayName} liked each other!`,
        'success',
        null
      );
    } catch (error) {
      console.error('Match error:', error);
      setLoading(false);
      showAlert('Error', 'Failed to create match. Please try again.', 'error');
    }
  };

  const handlePass = async () => {
    try {
      setShowPassAnimation(true);
      setLoading(true);
      
      // Small delay to ensure state is set
      await new Promise(resolve => setTimeout(resolve, 50));
      
      // Animate cross icon to center
      await new Promise((resolve) => {
        Animated.parallel([
          Animated.timing(passOverlayOpacity, {
            toValue: 1,
            duration: 350,
            useNativeDriver: true,
          }),
          Animated.spring(passIconScale, {
            toValue: 1.5,
            tension: 35,
            friction: 9,
            useNativeDriver: true,
          }),
        ]).start(resolve);
      });
      
      // Perform API call and Animation in parallel
      // Ensure we wait for at least one full spin (1000ms)
      const animationPromise = new Promise((resolve) => {
        Animated.timing(passSpinnerRotate, {
          toValue: 1,
          duration: 1000,
          easing: Easing.linear,
          useNativeDriver: true,
        }).start(resolve);
      });

      const apiPromise = matchId 
        ? api.post(`/matches/${matchId}/respond`, { action: 'decline' })
        : recordInteraction(user._id || user.id, 'PASS');

      // Wait for both to complete
      await Promise.all([animationPromise, apiPromise]);

      // Navigate back
      navigation.goBack();
    } catch (error) {
      console.error('Pass error:', error);
      setLoading(false);
      setShowPassAnimation(false);
      passIconScale.setValue(1);
      passIconY.setValue(0);
      passOverlayOpacity.setValue(0);
      showAlert('Error', 'Failed to decline. Please try again.', 'error');
    }
  };

  // Render full-width embedded photo
  const renderFullWidthPhoto = (photoUri, index, showBadge = false) => (
    <View key={`photo-${index}`} style={styles.embeddedPhotoContainer}>
      <Image
        source={{ uri: photoUri || 'https://via.placeholder.com/400x600' }}
        style={styles.embeddedPhoto}
      />
      {showBadge && (
        <View style={styles.verifiedBadgeContainer}>
          <MaterialCommunityIcons name="check-decagram" size={32} color="#4CAF50" />
        </View>
      )}
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <SafeAreaView style={styles.header} edges={['top']}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={28} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {user.displayName || user.name || 'Profile'}
        </Text>
        <View style={{ width: 28 }} />
      </SafeAreaView>

      {/* Scrollable Content */}
      <ScrollView 
        style={styles.scrollView} 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Primary Photo */}
        {organizedPhotos.length > 0 && renderFullWidthPhoto(organizedPhotos[0], 0, user.isVerified)}

        {/* Profile Info */}
        <View style={styles.content}>
          {/* Basic Info: Name, Age, Location */}
          <View style={styles.basicInfoSection}>
            <View style={styles.nameRow}>
              <Text style={styles.nameText}>
                {user.displayName || user.name}, {user.age}
              </Text>
              {user.gender && (
                <MaterialCommunityIcons 
                  name={user.gender === 'Female' ? 'gender-female' : 'gender-male'} 
                  size={24} 
                  color={theme.colors.text.secondary} 
                  style={{ marginLeft: 8 }}
                />
              )}
              {user.isVerified && (
                <MaterialCommunityIcons 
                  name="check-decagram" 
                  size={24} 
                  color="#4CAF50" 
                  style={{ marginLeft: 8 }}
                />
              )}
            </View>
            
            {user.location && (
              <View style={styles.locationRow}>
                <Ionicons name="location-sharp" size={16} color={theme.colors.text.secondary} />
                <Text style={styles.locationText}>{user.location}</Text>
              </View>
            )}
          </View>

          {/* Bio */}
          {user.bio && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>About Me</Text>
              <Text style={styles.bioTextPlain}>
                {user.bio}
              </Text>
            </View>
          )}

          {/* Looking For */}
          {(user.budget || user.relationshipType || user.preferences) && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Looking For</Text>
              <View style={styles.statsGridContainer}>
                {user.budget && (
                  <View style={styles.statRow}>
                    <Ionicons name="heart-outline" size={18} color={theme.colors.text.secondary} />
                    <Text style={styles.bioTextPlain}>{user.budget}</Text>
                  </View>
                )}
                {user.relationshipType && (
                  <View style={styles.statRow}>
                    <Ionicons name="people-circle-outline" size={18} color={theme.colors.text.secondary} />
                    <Text style={styles.bioTextPlain}>{user.relationshipType}</Text>
                  </View>
                )}
                {user.preferences && (
                  <View style={styles.statRow}>
                    <Ionicons name="male-female" size={18} color={theme.colors.text.secondary} />
                    <Text style={styles.bioTextPlain}>Interested in {user.preferences}</Text>
                  </View>
                )}
              </View>
            </View>
          )}

          {/* Photo 2 */}
          {organizedPhotos.length > 1 && renderFullWidthPhoto(organizedPhotos[1], 1)}

          {/* Essentials & Lifestyle Combined */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Essentials</Text>
            <View style={styles.statsGridContainer}>
              {user.height && (
                <View style={styles.statRow}>
                  <MaterialCommunityIcons name="ruler" size={18} color={theme.colors.text.secondary} />
                  <Text style={styles.bioTextPlain}>{user.height} cm</Text>
                </View>
              )}
              {user.occupation && (
                <View style={styles.statRow}>
                  <MaterialCommunityIcons name="briefcase-outline" size={18} color={theme.colors.text.secondary} />
                  <Text style={styles.bioTextPlain}>{user.occupation}</Text>
                </View>
              )}
              {user.education && (
                <View style={styles.statRow}>
                  <MaterialCommunityIcons name="school-outline" size={18} color={theme.colors.text.secondary} />
                  <Text style={styles.bioTextPlain}>{user.education}</Text>
                </View>
              )}
              {user.schoolUniversity && (
                <View style={styles.statRow}>
                  <FontAwesome5 name="university" size={14} color={theme.colors.text.secondary} />
                  <Text style={styles.bioTextPlain}>{user.schoolUniversity}</Text>
                </View>
              )}
              {user.weight && (
                <View style={styles.statRow}>
                  <FontAwesome5 name="weight" size={16} color={theme.colors.text.secondary} />
                  <Text style={styles.bioTextPlain}>{user.weight} kg</Text>
                </View>
              )}
              {user.zodiac && (
                <View style={styles.statRow}>
                  <Ionicons name="sparkles" size={16} color={theme.colors.text.secondary} />
                  <Text style={styles.bioTextPlain}>{user.zodiac}</Text>
                </View>
              )}
              {user.ethnicity && (
                <View style={styles.statRow}>
                  <Ionicons name="people" size={16} color={theme.colors.text.secondary} />
                  <Text style={styles.bioTextPlain}>{user.ethnicity}</Text>
                </View>
              )}
              {user.children && (
                <View style={styles.statRow}>
                  <Ionicons name="person" size={16} color={theme.colors.text.secondary} />
                  <Text style={styles.bioTextPlain}>{user.children}</Text>
                </View>
              )}
              {user.religion && (
                <View style={styles.statRow}>
                  <Ionicons name="book" size={16} color={theme.colors.text.secondary} />
                  <Text style={styles.bioTextPlain}>{user.religion}</Text>
                </View>
              )}
              {user.politics && (
                <View style={styles.statRow}>
                  <FontAwesome5 name="landmark" size={14} color={theme.colors.text.secondary} />
                  <Text style={styles.bioTextPlain}>{user.politics}</Text>
                </View>
              )}
            </View>
          </View>

          {/* Photo 3 */}
          {organizedPhotos.length > 2 && renderFullWidthPhoto(organizedPhotos[2], 2)}

          {/* Lifestyle */}
          {(user.drinking || user.smoking || user.drugs) && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Lifestyle</Text>
              <View style={styles.statsGridContainer}>
                {user.drinking && (
                  <View style={styles.statRow}>
                    <MaterialCommunityIcons name="glass-wine" size={18} color={theme.colors.text.secondary} />
                    <Text style={styles.bioTextPlain}>{user.drinking}</Text>
                  </View>
                )}
                {user.smoking && (
                  <View style={styles.statRow}>
                    <MaterialCommunityIcons name="smoking" size={18} color={theme.colors.text.secondary} />
                    <Text style={styles.bioTextPlain}>{user.smoking}</Text>
                  </View>
                )}
                {user.drugs && (
                  <View style={styles.statRow}>
                    <MaterialCommunityIcons name="leaf" size={18} color={theme.colors.text.secondary} />
                    <Text style={styles.bioTextPlain}>{user.drugs}</Text>
                  </View>
                )}
              </View>
            </View>
          )}

          {/* Interests */}
          {user.interests && user.interests.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Interests</Text>
              <View style={styles.interestsContainer}>
                {user.interests.map((interest, index) => {
                  const iconConfig = getInterestIcon(interest);
                  const IconComponent = iconConfig.library === "FontAwesome5" ? FontAwesome5 : Ionicons;
                  
                  return (
                    <View key={index} style={styles.interestItemWithIcon}>
                      <IconComponent
                        name={iconConfig.name}
                        size={16}
                        color={theme.colors.text.secondary}
                        style={styles.interestIcon}
                      />
                      <Text style={styles.bioTextPlain}>{interest}</Text>
                    </View>
                  );
                })}
              </View>
            </View>
          )}

          {/* Photo 4+ (remaining photos) */}
          {organizedPhotos
            .slice(3)
            .map((photo, index) => renderFullWidthPhoto(photo, index + 3))}

          {/* Deal-breakers */}
          {user.dealBreakers && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Deal-breakers</Text>
              <Text style={styles.bioTextPlain}>
                {user.dealBreakers}
              </Text>
            </View>
          )}



          {/* Bottom spacing for action buttons */}
          <View style={{ height: 120 }} />
        </View>
      </ScrollView>

      {/* Action Buttons - Fixed at Bottom (Hidden when from Connect Now) */}
      {!fromConnectNow && (
        <View style={styles.actionsContainer}>
          <TouchableOpacity
            style={[styles.actionButton]}
            onPress={handlePass}
            disabled={loading}
          >
            <View style={[styles.actionButtonCircle, styles.passButtonCircle, loading && styles.disabledButton]}>
              <Ionicons name="close" size={32} color="#000" />
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton]}
            onPress={handleMatch}
            disabled={loading}
          >
            {loading ? (
              <View style={[styles.actionButtonCircle, styles.likeCircle]}>
                <Animated.View
                  style={{
                    transform: [
                      { scale: heartScale },
                      {
                        rotate: heartRotate.interpolate({
                          inputRange: [0, 1],
                          outputRange: ['0deg', '360deg'],
                        }),
                      },
                    ],
                  }}
                >
                  <Ionicons name="heart" size={32} color="#FFF" />
                </Animated.View>
              </View>
            ) : (
              <View style={[styles.actionButtonCircle, styles.likeCircle]}>
                <Animated.View
                  style={{
                    transform: [{ scale: heartPump }],
                  }}
                >
                  <Ionicons name="heart" size={32} color="#FFF" />
                </Animated.View>
              </View>
            )}
          </TouchableOpacity>
        </View>
      )}

      {/* Custom Alert */}
      <CustomAlert
        visible={alertConfig.visible}
        title={alertConfig.title}
        message={alertConfig.message}
        type={alertConfig.type}
        onClose={hideAlert}
        buttons={[
          {
            text: 'Keep Browsing',
            style: 'cancel',
            onPress: () => {
              hideAlert();
              navigation.navigate('Discover');
            },
          },
          {
            text: 'Send Message',
            onPress: () => {
              hideAlert();
              navigation.navigate('Messages');
            },
          },
        ]}
      />
      
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
              {loading && (
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
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: theme.colors.background,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.text.primary,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 20,
  },
  embeddedPhotoContainer: {
    width: '100%',
    marginVertical: 20,
    paddingHorizontal: 16,
  },
  embeddedPhoto: {
    width: '100%',
    height: 480,
    resizeMode: 'cover',
    backgroundColor: '#f0f0f0',
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
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
    fontWeight: '800',
    color: theme.colors.text.primary,
    marginBottom: 16,
    letterSpacing: -0.5,
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
    gap: 8,
  },
  statRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    width: '48%',
  },
  statIcon: {
    width: 20,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  interestsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  interestItem: {
    width: '48%',
  },
  interestItemWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    width: '48%',
  },
  interestIcon: {
    width: 20,
  },
  tag: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 24,
    backgroundColor: 'rgba(0,0,0,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.06)',
  },
  tagText: {
    color: theme.colors.text.primary,
    fontSize: 15,
    fontWeight: '500',
  },
  lifestyleGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  lifestyleTextContainer: {
    gap: 8,
  },
  lifestyleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  lifestyleIcon: {
    width: 20,
  },
  lifestyleItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    minWidth: '45%',
    backgroundColor: 'rgba(0,0,0,0.03)',
    borderRadius: 12,
  },
  lifestyleText: {
    fontSize: 15,
    color: theme.colors.text.primary,
    fontWeight: '500',
  },
  basicInfoSection: {
    marginBottom: 24,
    marginTop: 8,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  nameText: {
    fontSize: 28,
    fontWeight: '800',
    color: theme.colors.text.primary,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  locationText: {
    fontSize: 16,
    color: theme.colors.text.secondary,
  },
  expectationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(0,0,0,0.03)',
    alignSelf: 'flex-start',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 12,
  },
  actionsContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 20,
    paddingVertical: 20,
    paddingHorizontal: 40,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#F2F2F7',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 10,
  },
  actionButton: {
    width: 64,
    height: 64,
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
  passButtonCircle: {
    backgroundColor: '#F5F5F5',
    borderWidth: 2,
    borderColor: '#E5E5EA',
  },
  likeCircle: {
    backgroundColor: '#D4AF37',
    borderWidth: 0,
    shadowColor: '#D4AF37',
  },
  disabledButton: {
    opacity: 0.5,
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
  verifiedBadgeContainer: {
    position: 'absolute',
    bottom: 24, // Positioned near bottom
    right: 24,  // Positioned near right
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 2,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
});

export default LikeProfileScreen;
