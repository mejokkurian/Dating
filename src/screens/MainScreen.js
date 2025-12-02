import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Alert,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { getPotentialMatches, getUserById } from '../services/api/user';
import { recordInteraction } from '../services/api/match';
import SwipeCard from '../components/SwipeCard';
import ProfileBottomSheet from '../components/ProfileBottomSheet';
import MatchCommentModal from '../components/MatchCommentModal';
import GradientButton from '../components/GradientButton';
import theme from '../theme/theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const MainScreen = ({ navigation, route }) => {
  const { user, userData } = useAuth();
  const [verificationStatus, setVerificationStatus] = useState(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [profiles, setProfiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedProfile, setSelectedProfile] = useState(null);
  const [showBottomSheet, setShowBottomSheet] = useState(false);
  const [showMatchModal, setShowMatchModal] = useState(false);
  const [matchProfile, setMatchProfile] = useState(null);
  const [isPendingMode, setIsPendingMode] = useState(false);

  React.useEffect(() => {
    const loadPendingProfile = async () => {
      if (route.params?.pendingProfile) {
        // Pending Match Mode
        console.log('Loading pending profile:', route.params.pendingProfile.displayName);
        
        // Set initial data from params (optimistic)
        setProfiles([route.params.pendingProfile]);
        setCurrentIndex(0);
        setIsPendingMode(true);
        setLoading(false);

        try {
          // Fetch full details to ensure we have all fields (occupation, location, etc.)
          const fullProfile = await getUserById(route.params.pendingProfile._id);
          if (fullProfile) {
            console.log('Fetched full profile details');
            setProfiles([fullProfile]);
          }
        } catch (error) {
          console.error('Error fetching full pending profile:', error);
          // Fallback is already set, so just log error
        }
      } else {
        // Normal Discovery Mode
        setIsPendingMode(false);
        loadInitialData();
      }
    };

    loadPendingProfile();
  }, [route.params?.pendingProfile]);

  // Handle Tab Press for Refresh
  React.useEffect(() => {
    const unsubscribe = navigation.getParent()?.addListener('tabPress', (e) => {
      if (navigation.isFocused()) {
        // If already focused, reload data
        console.log('Tab pressed while focused, refreshing...');
        if (isPendingMode) {
           // If in pending mode, maybe go back to normal mode? 
           // Or just reload pending profile? 
           // User said "reload the user details", so let's reload whatever mode we are in.
           // But usually double tap on home means "reset to top/fresh".
           // Let's just reload current state for now.
           // Actually, if in pending mode, tapping home tab usually takes you to "Home" (Discovery).
           // Let's switch to normal discovery mode if tab is pressed in pending mode.
           setIsPendingMode(false);
           navigation.setParams({ pendingProfile: null }); // Clear params
           loadInitialData();
        } else {
           loadInitialData();
        }
      }
    });

    return unsubscribe;
  }, [navigation, isPendingMode]);

  const loadInitialData = async () => {
    try {
      setLoading(true);
      await Promise.all([
        loadVerificationStatus(),
        loadProfiles()
      ]);
    } catch (error) {
      console.error('Error loading initial data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadVerificationStatus = async () => {
    // Verification logic to be implemented in backend
    // For now, assume unverified or fetch from user profile
    if (userData?.isVerified) {
      setVerificationStatus('verified');
    }
  };

  const loadProfiles = async () => {
    try {
      const matches = await getPotentialMatches();
      setProfiles(matches);
    } catch (error) {
      console.error('Error loading profiles:', error);
      Alert.alert('Error', 'Failed to load profiles');
    }
  };

  const handleCardPress = (profile) => {
    setSelectedProfile(profile);
    setShowBottomSheet(true);
  };

  const handleDoubleTap = (profile) => {
    setMatchProfile(profile);
    setShowMatchModal(true);
  };

  const handleSendMatch = async (profile, comment) => {
    console.log('Match request sent to:', profile.name);
    console.log('Comment:', comment);
    
    // Simulate match
    Alert.alert(
      '💫 Match Request Sent!',
      comment 
        ? `Your message to ${profile.name}: "${comment}"`
        : `Match request sent to ${profile.name}!`,
      [{ text: 'Great!', style: 'default' }]
    );
    
    setCurrentIndex((prev) => prev + 1);
  };

  const handleSwipeLeft = async (profile) => {
    console.log('Passed:', profile.name);
    try {
      await recordInteraction(profile._id, 'PASS');
    } catch (error) {
      console.error('Error recording pass:', error);
    }
    
    if (isPendingMode) {
      // Exit pending mode and load discovery feed
      setIsPendingMode(false);
      navigation.setParams({ pendingProfile: null });
      setCurrentIndex(0);
      loadProfiles();
    } else {
      setCurrentIndex((prev) => prev + 1);
    }
  };

  const handleSwipeRight = async (profile) => {
    console.log('Liked:', profile.name);
    try {
      const result = await recordInteraction(profile._id, 'LIKE');
      
      // Check if it's a mutual match
      if (result.match && result.match.isMutual) {
        Alert.alert(
          '🎉 It\'s a Match!',
          `You and ${profile.name || profile.displayName} liked each other!`,
          [
            { 
              text: 'Send Message', 
              onPress: () => navigation.navigate('Chat', {
                user: profile,
                matchStatus: 'active',
                isInitiator: false
              })
            },
            { 
              text: 'Keep Swiping', 
              style: 'cancel', 
              onPress: () => {
                if (isPendingMode) {
                  // Exit pending mode and load discovery feed
                  setIsPendingMode(false);
                  navigation.setParams({ pendingProfile: null });
                  setCurrentIndex(0);
                  loadProfiles();
                }
              }
            },
          ]
        );
      } else if (isPendingMode) {
        // Exit pending mode and load discovery feed
        setIsPendingMode(false);
        navigation.setParams({ pendingProfile: null });
        setCurrentIndex(0);
        loadProfiles();
      }
    } catch (error) {
      console.error('Error recording like:', error);
    }
    
    if (!isPendingMode) {
      setCurrentIndex((prev) => prev + 1);
    }
  };

  const handleSuperLike = async (profile) => {
    console.log('Super Liked:', profile.name);
    try {
      const result = await recordInteraction(profile._id, 'SUPERLIKE');
      
      Alert.alert(
        '⭐ Super Like Sent!',
        `${profile.name || profile.displayName} will see that you super liked them!`,
        [{ text: 'OK' }]
      );

      // Check if it's a mutual match
      if (result.match && result.match.isMutual) {
        setTimeout(() => {
          Alert.alert(
            '🎉 It\'s a Match!',
            `You and ${profile.name || profile.displayName} liked each other!`,
            [
              { 
                text: 'Send Message', 
                onPress: () => navigation.navigate('Chat', {
                  user: profile,
                  matchStatus: 'active',
                  isInitiator: false
                })
              },
              { text: 'Keep Swiping', style: 'cancel' },
            ]
          );
        }, 500);
      }
    } catch (error) {
      console.error('Error recording super like:', error);
    }
    setCurrentIndex((prev) => prev + 1);
    setShowBottomSheet(false);
  };

  const handleLikeFromSheet = () => {
    if (selectedProfile) {
      handleSwipeRight(selectedProfile);
    }
    setShowBottomSheet(false);
  };

  const handlePassFromSheet = () => {
    if (selectedProfile) {
      handleSwipeLeft(selectedProfile);
    }
    setShowBottomSheet(false);
  };

  const handleLike = () => {
    if (currentIndex < profiles.length) {
      handleSwipeRight(profiles[currentIndex]);
    }
  };

  const handleNope = () => {
    if (currentIndex < profiles.length) {
      handleSwipeLeft(profiles[currentIndex]);
    }
  };

  const currentProfile = profiles[currentIndex];

  if (loading) {
    return (
      <LinearGradient
        colors={theme.colors.gradients.background}
        style={[styles.gradient, { justifyContent: 'center', alignItems: 'center' }]}
      >
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </LinearGradient>
    );
  }

  console.log('Current Profile:', currentProfile);

  return (
    <LinearGradient
      colors={theme.colors.gradients.background}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.gradient}
    >
      <View style={styles.container}>
        {/* Header */}
        <LinearGradient
          colors={['rgba(255,255,255,0.2)', 'transparent']}
          style={styles.header}
        >
          <View style={styles.headerLeft}>
            {isPendingMode ? (
              <TouchableOpacity 
                style={styles.backButton}
                onPress={() => {
                  setIsPendingMode(false);
                  navigation.setParams({ pendingProfile: null });
                  setCurrentIndex(0);
                  loadProfiles();
                }}
              >
                <Ionicons name="arrow-back" size={28} color={theme.colors.text.primary} />
              </TouchableOpacity>
            ) : (
              <TouchableOpacity 
                style={styles.profileButton}
                onPress={() => navigation.navigate('Profile')}
              >
                <Ionicons name="person-circle-outline" size={32} color={theme.colors.text.primary} />
              </TouchableOpacity>
            )}
          </View>
          
          {!isPendingMode && (
            <Text style={styles.headerTitle}>Discover</Text>
          )}
          
          <View style={styles.headerRight}>
            <TouchableOpacity 
              style={styles.filterButton}
              onPress={() => {/* TODO: Open filter modal */}}
            >
              <Ionicons name="options-outline" size={24} color={theme.colors.text.primary} />
            </TouchableOpacity>
          </View>
        </LinearGradient>

        {/* Filter Bar */}
        <View style={styles.filterBar}>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterScrollContent}
          >
            <TouchableOpacity style={styles.filterChip}>
              <Ionicons name="location-outline" size={16} color={theme.colors.primary} />
              <Text style={styles.filterChipText}>Distance</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.filterChip}>
              <Ionicons name="calendar-outline" size={16} color={theme.colors.primary} />
              <Text style={styles.filterChipText}>Age</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.filterChip}>
              <Ionicons name="checkmark-circle-outline" size={16} color={theme.colors.primary} />
              <Text style={styles.filterChipText}>Verified</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.filterChip}>
              <Ionicons name="star-outline" size={16} color={theme.colors.primary} />
              <Text style={styles.filterChipText}>Premium</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.filterChip}>
              <Ionicons name="heart-outline" size={16} color={theme.colors.primary} />
              <Text style={styles.filterChipText}>Lifestyle</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>

        {/* Card Stack */}
        <View style={styles.cardContainer}>
          {currentIndex < profiles.length ? (
            <SwipeCard
              key={currentProfile.id}
              data={currentProfile}
              onSwipeLeft={handleSwipeLeft}
              onSwipeRight={handleSwipeRight}
              onCardPress={handleCardPress}
              onDoubleTap={handleDoubleTap}
            />
          ) : (
            <View style={styles.noMoreCards}>
              <Text style={styles.noMoreCardsEmoji}>🎉</Text>
              <Text style={styles.noMoreCardsText}>
                You've seen everyone!
              </Text>
              <Text style={styles.noMoreCardsSubtext}>
                Check back later for more matches
              </Text>
              <GradientButton
                title="Refresh"
                onPress={() => {
                  setCurrentIndex(0);
                  loadProfiles();
                }}
                variant="warm"
                size="medium"
                style={styles.refreshButton}
              />
            </View>
          )}
        </View>
      </View>

      {/* Profile Bottom Sheet */}
      <ProfileBottomSheet
        visible={showBottomSheet}
        profile={selectedProfile}
        onClose={() => setShowBottomSheet(false)}
        onLike={handleLikeFromSheet}
        onPass={handlePassFromSheet}
        onSuperLike={() => handleSuperLike(selectedProfile)}
      />

      {/* Match Comment Modal */}
      <MatchCommentModal
        visible={showMatchModal}
        profile={matchProfile}
        onClose={() => setShowMatchModal(false)}
        onSend={handleSendMatch}
      />
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  gradient: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.lg,
    paddingTop: 50,
    paddingBottom: theme.spacing.xs,
  },
  headerLeft: {
    flex: 1,
    alignItems: 'flex-start',
  },
  headerRight: {
    flex: 1,
    alignItems: 'flex-end',
  },
  headerIcon: {
    fontSize: 28,
  },
  headerTitle: {
    fontSize: theme.typography.fontSize['2xl'],
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.text.primary,
    textAlign: 'center',
  },
  filterButton: {
    padding: 8,
  },
  backButton: {
    padding: 8,
  },
  profileButton: {
    padding: 4,
  },
  filterBar: {
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.xs,
    marginBottom: theme.spacing.xs,
  },
  filterScrollContent: {
    gap: 10,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: theme.colors.glass.background,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: theme.colors.glass.border,
  },
  filterChipText: {
    fontSize: 14,
    color: theme.colors.text.primary,
    fontWeight: '500',
  },
  cardContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -100,
  },
  noMoreCards: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: theme.spacing['2xl'],
  },
  noMoreCardsEmoji: {
    fontSize: 80,
    marginBottom: theme.spacing.lg,
  },
  noMoreCardsText: {
    fontSize: theme.typography.fontSize['2xl'],
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.text.primary,
    marginBottom: theme.spacing.sm,
    textAlign: 'center',
  },
  noMoreCardsSubtext: {
    fontSize: theme.typography.fontSize.base,
    color: theme.colors.text.secondary,
    opacity: 0.8,
    textAlign: 'center',
    marginBottom: theme.spacing.xl,
  },
  refreshButton: {
    marginTop: theme.spacing.lg,
  },
});

export default MainScreen;

