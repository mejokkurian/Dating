import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Dimensions,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  Alert,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../context/ThemeContext";

// Components
import ParallaxProfileCard from "../components/ParallaxProfileCard";
import ProfileBottomSheet from "../components/ProfileBottomSheet";
import MatchCommentModal from "../components/MatchCommentModal";
import SuperLikeModal from "../components/SuperLikeModal";
import FilterBottomSheet from "../components/FilterBottomSheet";
import DateCallToAction from "../components/DateCallToAction";
import DateConfirmationModal from "../components/DateConfirmationModal";
import CoachmarkOverlay from "../components/CoachmarkOverlay";
import HomeHeader from "../components/HomeHeader";
import EmptyCardState from "../components/EmptyCardState";
import PassOverlay from "../components/PassOverlay";
import HeartOverlay from "../components/HeartOverlay";

// Hooks
import { useDiscoverProfiles } from "../hooks/useDiscoverProfiles";
import { useCardInteractions } from "../hooks/useCardInteractions";
import { useNetworkStatus } from "../hooks/useNetworkStatus";

// Analytics
import * as discoverAnalytics from "../services/discoverAnalytics";

// API
import { recordInteraction } from "../services/api/match";

const MainScreen = ({ navigation, route }) => {
  const { colors } = useTheme();
  // --- 1. State & Data Hook ---
  const {
      profiles,
      loading,
      error,
      currentIndex,
      setCurrentIndex,
      isPendingMode,
      setIsPendingMode,
      showTutorial,
      setShowTutorial,
      completeTutorial,
      handleUndo,
      loadProfiles,
      loadInitialData,
  } = useDiscoverProfiles();

  // Network status
  const { isOffline } = useNetworkStatus();

  // --- 2. Interactions & Animation Hook ---
  const {
      swipeY,
      cardOpacity,
      handleSwipeUp,
      handleSuperLike,
      handleLike,
      isActionLoading,
      animationState,
      triggerLikeAnimation,
      isLimitReachedShared,
      showPaywall,
  } = useCardInteractions(
      profiles, 
      currentIndex, 
      setCurrentIndex, 
      isPendingMode, 
      setIsPendingMode, 
      loadProfiles
  );

  // Pull-to-refresh state
  const [refreshing, setRefreshing] = useState(false);

  // Track screen view
  useEffect(() => {
    discoverAnalytics.trackDiscoverScreenView();
  }, []);

  // Track profiles loaded
  useEffect(() => {
    if (!loading && profiles.length > 0) {
      // This is approximate - in real implementation, track actual load time
      discoverAnalytics.trackProfilesLoaded(profiles.length, 0);
    }
  }, [loading, profiles.length]);

  // --- 3. Local UI State ---
  const [showBottomSheet, setShowBottomSheet] = useState(false);
  const [selectedProfile, setSelectedProfile] = useState(null);
  
  const [showMatchModal, setShowMatchModal] = useState(false);
  const [matchProfile, setMatchProfile] = useState(null);

  const [showSuperLikeModal, setShowSuperLikeModal] = useState(false);
  const [superLikeProfile, setSuperLikeProfile] = useState(null);

  const [showFilterModal, setShowFilterModal] = useState(false);
  const [filterState, setFilterState] = useState({
    distance: 50, // km
    ageMin: 18,
    ageMax: 35,
    heightMin: 140, // cm
    verified: false,
    premium: false,
    education: [],
    drinking: [],
    smoking: [],
    kids: [],
    religion: [],
  });

  const [showDateModal, setShowDateModal] = useState(false);
  const [selectedDateOption, setSelectedDateOption] = useState(null);

  // Tutorial Step State
  const [tutorialStep, setTutorialStep] = useState(0);


  // --- 4. Handlers ---

  const handleCardPress = useCallback((profile) => {
    if (showTutorial && tutorialStep === 0) {
        setTutorialStep(1); 
    }
    
    // Track profile view
    const profileId = profile?._id || profile?.id;
    if (profileId) {
      discoverAnalytics.trackProfileView(profileId);
    }
    
    setSelectedProfile(profile);
    setShowBottomSheet(true);
  }, [showTutorial, tutorialStep]);

  const handleSendMatch = async (profile, comment) => {
    // Input validation
    if (!profile) {
      Alert.alert('Error', 'Invalid profile. Please try again.');
      return;
    }

    const targetId = profile._id || profile.id;
    if (!targetId || typeof targetId !== 'string' || targetId.trim().length === 0) {
      Alert.alert('Error', 'Invalid profile ID. Please try again.');
      return;
    }

    try {
      // Record match request with comment
      await recordInteraction(targetId, "LIKE", comment);
      
      // Track success
      discoverAnalytics.trackMatchRequest(targetId, true);
      
      // Advance to next card
      setCurrentIndex((prev) => prev + 1);
      
      // Show success feedback (optional)
      // You could show a toast or notification here
    } catch (error) {
      if (__DEV__) {
        console.error("Error sending match request:", error);
      }
      
      // Track failure
      discoverAnalytics.trackMatchRequest(targetId, false, error);
      
      Alert.alert(
        'Error',
        'Failed to send match request. Please try again.',
        [{ text: 'OK' }]
      );
    }
  };

  // Handle pull-to-refresh
  const onRefresh = async () => {
    setRefreshing(true);
    discoverAnalytics.trackEmptyStateAction('refresh');
    try {
      await loadInitialData();
    } catch (err) {
      // Error is already handled in loadInitialData
    } finally {
      setRefreshing(false);
    }
  };

  // Memoize current profile to prevent unnecessary re-renders
  const currentProfile = useMemo(() => {
    return profiles[currentIndex];
  }, [profiles, currentIndex]);

  // --- 5. Render ---

  if (loading) {
    return (
      <LinearGradient
        colors={colors.gradients.background}
        style={[
          styles.gradient,
          { justifyContent: "center", alignItems: "center" },
        ]}
      >
        <ActivityIndicator size="large" color={colors.accent} />
        <Text style={[styles.loadingText, { color: colors.text.secondary }]}>Loading profiles...</Text>
      </LinearGradient>
    );
  }

  // Error State
  if (error && profiles.length === 0) {
    return (
      <LinearGradient
        colors={colors.gradients.background}
        style={styles.gradient}
      >
        <View style={styles.container}>
          <HomeHeader
            isPendingMode={false}
            onBack={() => {}}
            onProfilePress={() => navigation.navigate("Profile")}
            onFilterPress={() => {}}
            onUndo={() => {}}
            canUndo={false}
          />
          <ScrollView 
            contentContainerStyle={styles.errorContainer}
            refreshControl={null}
          >
            {error.isOffline || isOffline ? (
              <>
                <Ionicons name="cloud-offline-outline" size={80} color="#FF5252" />
                <Text style={styles.errorTitle}>No Internet Connection</Text>
                <Text style={styles.errorText}>
                  Please check your internet connection and try again.
                </Text>
              </>
            ) : (
              <>
                <Ionicons name="alert-circle-outline" size={80} color="#FF5252" />
                <Text style={styles.errorTitle}>
                  {error.isNetworkError 
                    ? (error.networkErrorType === 'timeout' ? 'Connection Timeout' : 'No Connection')
                    : error.response?.status === 401
                    ? 'Authentication Required'
                    : error.response?.status === 403
                    ? 'Permission Denied'
                    : 'Unable to Load Profiles'}
                </Text>
                <Text style={styles.errorText}>
                  {error.isNetworkError
                    ? error.userMessage || 'Please check your internet connection and try again.'
                    : error.response?.status === 401 
                    ? 'Please log in again to view profiles.'
                    : error.response?.status === 403
                    ? 'You don\'t have permission to view profiles.'
                    : error.response?.status === 404
                    ? 'Profiles not found. Please try again.'
                    : error.response?.status === 429
                    ? 'Too many requests. Please wait a moment and try again.'
                    : error.response?.status >= 500
                    ? 'Our servers are experiencing issues. Please try again later.'
                    : 'Unable to load profiles. Please check your connection and try again.'}
                </Text>
              </>
            )}
            <TouchableOpacity
              style={styles.retryButton}
              onPress={() => {
                loadInitialData();
              }}
            >
              <Ionicons name="refresh" size={20} color="#FFFFFF" style={{ marginRight: 8 }} />
              <Text style={styles.retryButtonText}>Try Again</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient
      colors={colors.gradients.background}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.gradient}
    >
      <View style={styles.container}>
        {/* Header */}
        <HomeHeader
            isPendingMode={isPendingMode}
            onBack={() => {
                setIsPendingMode(false);
                navigation.setParams({ pendingProfile: null });
                setCurrentIndex(0);
                loadProfiles();
            }}
            onProfilePress={() => navigation.navigate("Profile")}
            onFilterPress={() => setShowFilterModal(true)}
            onUndo={() => {
                discoverAnalytics.trackUndoAction();
                handleUndo();
            }}
            canUndo={currentIndex > 0}
        />
        
        {/* Offline Banner */}
        {isOffline && (
          <View style={styles.offlineBanner}>
            <Ionicons name="cloud-offline-outline" size={16} color="#FFFFFF" />
            <Text style={styles.offlineBannerText}>No Internet Connection</Text>
          </View>
        )}

        {/* Card Stack */}
        <ScrollView
          contentContainerStyle={styles.cardContainer}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.accent}
            />
          }
          scrollEnabled={false}
          horizontal={false}
          showsHorizontalScrollIndicator={false}
          bounces={false}
        >
          {currentIndex < profiles.length && currentProfile ? (
            <ParallaxProfileCard
              key={currentProfile.id || currentIndex}
              data={currentProfile}
              onSwipeUp={handleSwipeUp}
              onCardPress={handleCardPress}
              disabled={showBottomSheet || showMatchModal || showSuperLikeModal || isOffline || isActionLoading}
              swipeAnimatedValue={swipeY}
              cardOpacity={cardOpacity}
              isLimitReachedShared={isLimitReachedShared}
              onSwipeLimited={() => showPaywall('swipes')}
              accessibilityLabel={`Profile card for ${currentProfile.displayName || currentProfile.name || 'user'}`}
              accessibilityHint="Double tap to view full profile, swipe up to pass"
            />
          ) : (
            <EmptyCardState 
                onRefresh={async () => {
                    setCurrentIndex(0);
                    await loadInitialData();
                }}
                onFilter={() => {
                  discoverAnalytics.trackFilterApplied(filterState);
                  setShowFilterModal(true);
                }}
            />
          )}
        </ScrollView>
      </View>

      {/* --- Modals & Overlays --- */}

      <ProfileBottomSheet
        visible={showBottomSheet}
        profile={selectedProfile}
        onClose={() => setShowBottomSheet(false)}
        onLike={(profile) => {
             // Handle Like from Sheet with smooth transition
             handleLike(profile, setShowBottomSheet);
        }}
        onPass={() => {
            if (selectedProfile) handleSwipeUp(selectedProfile);
            setShowBottomSheet(false);
        }}
        onSuperLike={(profile) => {
             setSuperLikeProfile(profile || selectedProfile);
             setShowSuperLikeModal(true);
             setShowBottomSheet(false);
        }}
        showTutorial={showTutorial}
        tutorialStep={tutorialStep}
        onTutorialNext={() => {
            setShowBottomSheet(false);
            setTutorialStep(2);
        }}
      />

      <MatchCommentModal
        visible={showMatchModal}
        profile={matchProfile}
        onClose={() => setShowMatchModal(false)}
        onSend={handleSendMatch}
      />

      <SuperLikeModal
        visible={showSuperLikeModal}
        profile={superLikeProfile}
        onClose={() => setShowSuperLikeModal(false)}
        onSend={(profile, comment) => handleSuperLike(profile, comment, setShowSuperLikeModal)}
      />

      <FilterBottomSheet
        visible={showFilterModal}
        filterState={filterState}
        onClose={() => setShowFilterModal(false)}
        onUpdateFilter={(newFilters) => {
          discoverAnalytics.trackFilterApplied(newFilters);
          setFilterState(newFilters);
        }}
      />

      {/* Date Proposal Pill */}
      {currentIndex < profiles.length && !showBottomSheet && !isPendingMode && (
         <DateCallToAction 
            swipeAnimatedValue={swipeY}
            onDrop={(resetFunc, dateOption) => {
               setSelectedDateOption(dateOption);
               setShowDateModal(true);
               resetFunc();
            }}
         />
      )}
      
      <DateConfirmationModal 
          visible={showDateModal}
          dateOption={selectedDateOption}
          profileName={currentProfile?.displayName || "this user"}
          onClose={() => setShowDateModal(false)}
          onConfirm={() => {
              if (selectedDateOption) handleSendMatch(currentProfile, selectedDateOption.message);
              setShowDateModal(false);
          }}
      />

      {/* Coachmark Guide */}
      {(!showBottomSheet || tutorialStep !== 1) && profiles.length > 0 && (
      <CoachmarkOverlay
        visible={showTutorial}
        step={tutorialStep}
        steps={[
            {
                title: "Welcome to Discovery",
                message: "Tap on any card to view their full profile, photos, and interests. Swipe up to unmatch!",
                icon: "finger-print",
                position: "center"
            },
            {
                title: "Make Your Move",
                message: "Use the buttons below to Match, Adore, or Pass.",
                icon: "heart-circle",
                position: "bottom-sheet"
            },
            {
                title: "Instant Date",
                message: "Drag the 'Action Pill' anytime to propose an instant coffee or dinner date!",
                icon: "flash",
                position: "pill"
            }
        ]}
        onNext={() => {
            if (tutorialStep === 0) {
                const targetProfile = profiles.length > 0 ? profiles[currentIndex] : null;
                if (targetProfile) {
                     setTutorialStep(1); 
                     setSelectedProfile(targetProfile);
                     setShowBottomSheet(true);
                }
            } else {
                 setTutorialStep(tutorialStep + 1);
            }
        }}
        onComplete={() => completeTutorial()}
      />
      )}
      
      {/* Heart/Like Animation Overlay */}
      <HeartOverlay
        visible={animationState.showLikeAnimation}
        heartScale={animationState.likeHeartScale}
        particleOpacity={animationState.likeParticleOpacity}
        particles={animationState.particles}
      />
      
      {/* Pass Animation Overlay using extracted component */}
      <PassOverlay 
        visible={animationState.showPassAnimation}
        opacity={animationState.passOverlayOpacity}
        scale={animationState.passIconScale}
        rotate={animationState.passSpinnerRotate}
        loading={animationState.isPassLoading}
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
  cardContainer: {
    flex: 1,
    width: '100%',
    paddingHorizontal: 15,
    paddingBottom: 110,
    justifyContent: "flex-start",
    alignItems: "center",
    paddingTop: 58, // Push card below the date pills (pills end ~135px from top, header ~95px + 58 = 153px)
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: "#666",
  },
  errorContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 40,
    paddingBottom: 100,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#333",
    marginTop: 20,
    marginBottom: 8,
    textAlign: "center",
  },
  errorText: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
    lineHeight: 24,
    marginBottom: 32,
  },
  retryButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#D4AF37",
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 25,
    minWidth: 150,
  },
  retryButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  offlineBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FF5252',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginTop: 8,
    marginHorizontal: 15,
    alignSelf: 'flex-start',
    gap: 6,
  },
  offlineBannerText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
});

export default MainScreen;
