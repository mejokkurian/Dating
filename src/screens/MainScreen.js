import React, { useState ,} from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Alert,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import Animated, { useSharedValue } from "react-native-reanimated"; // Added import
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../context/AuthContext";
import { getPotentialMatches, getUserById } from "../services/api/user";
import { recordInteraction } from "../services/api/match";
import ParallaxProfileCard from "../components/ParallaxProfileCard";
import ProfileBottomSheet from "../components/ProfileBottomSheet";
import MatchCommentModal from "../components/MatchCommentModal";
import SuperLikeModal from "../components/SuperLikeModal";
import FilterModal from "../components/FilterModal";
import GradientButton from "../components/GradientButton";
import DateCallToAction from "../components/DateCallToAction";
import HeartAnimationOverlay from "../components/HeartAnimationOverlay"; // New Overlay
import CustomAlert from "../components/CustomAlert";
import NotificationBottomSheet from "../components/NotificationBottomSheet"; // Premium Bottom Sheet
import DateConfirmationModal from "../components/DateConfirmationModal"; // Premium Modal
import CoachmarkOverlay from "../components/CoachmarkOverlay"; // Premium Coachmarks
import theme from "../theme/theme";
import { useProfileAnimations } from "../hooks/useProfileAnimations"; // Hook
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width: SCREEN_WIDTH } = Dimensions.get("window");

const MainScreen = ({ navigation, route }) => {
  const { user, userData } = useAuth();
  // const superLikeAnimRef = React.useRef(null); // Removed for premium aesthetic
  const swipeY = useSharedValue(0); // Initialize SharedValue
  const [verificationStatus, setVerificationStatus] = useState(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [profiles, setProfiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedProfile, setSelectedProfile] = useState(null);
  const [showBottomSheet, setShowBottomSheet] = useState(false);
  const [showMatchModal, setShowMatchModal] = useState(false);
  const [showSuperLikeModal, setShowSuperLikeModal] = useState(false);
  const [matchProfile, setMatchProfile] = useState(null);
  const [superLikeProfile, setSuperLikeProfile] = useState(null);
  const [showDateModal, setShowDateModal] = useState(false);
  const [selectedDateOption, setSelectedDateOption] = useState(null);
  const [isPendingMode, setIsPendingMode] = useState(false);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [filterState, setFilterState] = useState({
    distance: null,
    age: null,
    verified: false,
    premium: false,
    lifestyle: [],
  });
  
  // Tutorial State
  const [showTutorial, setShowTutorial] = useState(false);
  const [tutorialStep, setTutorialStep] = useState(0);
  
  // Notification Bottom Sheet State
  const [notificationState, setNotificationState] = useState({
    visible: false,
    title: '',
    message: '',
    buttonText: 'OK',
    type: 'info',
  });

  // Animation Hook
  const {
      showLikeAnimation,
      likeHeartScale,
      likeParticleOpacity,
      particles,
      triggerLikeAnimation,
      resetAnimations
  } = useProfileAnimations();



  React.useEffect(() => {
    const loadPendingProfile = async () => {
      if (route.params?.pendingProfile) {
        // Pending Match Mode
        console.log(
          "Loading pending profile:",
          route.params.pendingProfile.displayName
        );

        // Set initial data from params (optimistic)
        setProfiles([route.params.pendingProfile]);
        setCurrentIndex(0);
        setIsPendingMode(true);
        setLoading(false);

        try {
          // Fetch full details to ensure we have all fields (occupation, location, etc.)
          const profileId =
            route.params.pendingProfile._id || route.params.pendingProfile.id;
          if (!profileId) {
            console.error(
              "Pending profile missing ID:",
              route.params.pendingProfile
            );
            return;
          }

          const fullProfile = await getUserById(profileId);
          if (fullProfile) {
            console.log("Fetched full profile details");
            // Ensure profile has both id and _id
            if (!fullProfile.id && fullProfile._id) {
              fullProfile.id = fullProfile._id;
            }
            if (!fullProfile._id && fullProfile.id) {
              fullProfile._id = fullProfile.id;
            }
            setProfiles([fullProfile]);
          }
        } catch (error) {
          console.error("Error fetching full pending profile:", error);
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
    const unsubscribe = navigation.getParent()?.addListener("tabPress", (e) => {
      if (navigation.isFocused()) {
        // If already focused, reload data
        console.log("Tab pressed while focused, refreshing...");
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

  // Refresh profiles when screen comes into focus (e.g., returning from Connect Now)
  React.useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      // Only refresh if not in pending mode and not loading
      if (!isPendingMode && !loading) {
        console.log('Screen focused, refreshing profiles...');
        loadProfiles();
      }
    });

    return unsubscribe;
  }, [navigation, isPendingMode, loading]);

  const loadInitialData = async () => {
    try {
      setLoading(true);
      await Promise.all([loadVerificationStatus(), loadProfiles()]);
      
      // Check for Tutorial
      if (userData?._id) {
          const tutorialKey = `hasSeenTutorial_${userData._id}`;
          const hasSeenTutorial = await AsyncStorage.getItem(tutorialKey);
          if (!hasSeenTutorial) {
              setTimeout(() => {
                  setShowTutorial(true);
                  setTutorialStep(0);
              }, 1000); // Small delay to let UI settle
          }
      }
    } catch (error) {
      console.error("Error loading initial data:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadVerificationStatus = async () => {
    // Verification logic to be implemented in backend
    // For now, assume unverified or fetch from user profile
    if (userData?.isVerified) {
      setVerificationStatus("verified");
    }
  };

  const loadProfiles = async () => {
    try {
      const matches = await getPotentialMatches();
      console.log("Loaded profiles count:", matches?.length);

      // Normalize profiles to ensure they have both id and _id
      const normalizedMatches =
        matches?.map((profile) => {
          // Ensure both id and _id are present
          if (profile._id && !profile.id) {
            profile.id = profile._id;
          }
          if (profile.id && !profile._id) {
            profile._id = profile.id;
          }
          return profile;
        }) || [];

      if (normalizedMatches.length > 0) {
        console.log(
          "First profile structure:",
          JSON.stringify(normalizedMatches[0], null, 2)
        );
        console.log("First profile has _id:", !!normalizedMatches[0]._id);
        console.log("First profile has id:", !!normalizedMatches[0].id);
      }

      setProfiles(normalizedMatches);
    } catch (error) {
      console.error("Error loading profiles:", error);
      setNotificationState({
        visible: true,
        title: 'Error',
        message: 'Failed to load profiles. Please check your connection.',
        type: 'error',
      });
    }
  };


  const handleCardPress = (profile) => {
    // If Tutorial Mode Step 0 (Tap Card), advance to Step 1 (Detailed View)
    if (showTutorial && tutorialStep === 0) {
        setTutorialStep(1); 
        // We pause the "tutorial overlay" while the bottom sheet opens? 
        // Actually, we can keep the overlay active but update the text to "Now you see details..."
        // Or we just open the sheet and the Overlay re-renders with the new step.
    }
    
    setSelectedProfile(profile);
    setShowBottomSheet(true);
  };

  const handleDoubleTap = (profile) => {
    setMatchProfile(profile);
    setShowMatchModal(true);
  };

  const handleSendMatch = async (profile, comment) => {
    console.log("Match request sent to:", profile.name);
    console.log("Comment:", comment);

    // Simulate match
    // Simulate match
    setNotificationState({
      visible: true,
      title: 'Match Request Sent!',
      message: comment
        ? `Your message to ${profile.displayName} has been sent.`
        : `Request sent to ${profile.displayName}!`,
      buttonText: 'Great!',
      type: 'success',
    });

    setCurrentIndex((prev) => prev + 1);
  };

  const handleSwipeUp = async (profile) => {
    console.log("Rejected:", profile?.name || profile?.displayName);
    console.log("Profile object:", JSON.stringify(profile, null, 2));

    try {
      const targetId = profile?._id || profile?.id;
      if (!targetId) {
        console.error(
          "Profile ID is missing. Profile keys:",
          profile ? Object.keys(profile) : "profile is null"
        );
        console.error("Full profile:", profile);
        return;
      }

      console.log("Calling recordInteraction with targetId:", targetId);
      // Temporarily disabled for testing
      await recordInteraction(targetId, "PASS");
    } catch (error) {
      console.error("Error recording reject:", error);
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

  const handleSuperLike = async (profile, comment = "") => {
    console.log("Super Liked:", profile?.name || profile?.displayName);
    console.log("Comment:", comment);
    console.log("Profile object:", JSON.stringify(profile, null, 2));

    try {
      const targetId = profile?._id || profile?.id;
      if (!targetId) {
        console.error(
          "Profile ID is missing. Profile keys:",
          profile ? Object.keys(profile) : "profile is null"
        );
        console.error("Full profile:", profile);
        return;
      }

      console.log("Calling recordInteraction with targetId:", targetId);
      const result = await recordInteraction(targetId, "SUPERLIKE");

      // Trigger Animation (Premium Heartfullness)
      triggerLikeAnimation(() => {
          // After animation (800ms), move to next card
          setCurrentIndex((prev) => prev + 1);
          setShowBottomSheet(false);
      });

      // Check if it's a mutual match

      // Check if it's a mutual match
      if (result.match && result.match.isMutual) {
        setTimeout(() => {
          Alert.alert(
            "🎉 It's a Match!",
            `You and ${profile.name || profile.displayName} liked each other!`,
            [
              {
                text: "Send Message",
                onPress: () =>
                  navigation.navigate("Chat", {
                    user: profile,
                    matchStatus: "active",
                    isInitiator: false,
                  }),
              },
              { text: "Keep Swiping", style: "cancel" },
            ]
          );
        }, 500);
      }
    } catch (error) {
      console.error("Error recording super like:", error);
    }
  };

  const handleSuperLikePress = (profile) => {
    setSuperLikeProfile(profile || selectedProfile);
    setShowSuperLikeModal(true);
    setShowBottomSheet(false);
  };

  const handleLikeFromSheet = async (profile) => {
    // Capture profile reference immediately
    const targetProfile = profile || selectedProfile;
    
    if (!targetProfile) {
      console.error("No profile provided to handleLikeFromSheet");
      return;
    }

    // Optimistic Update with Visual Delay: 
    // Wait 500ms for the "Heart" animation to play before closing the sheet.
    setTimeout(() => {
        setShowBottomSheet(false);
    }, 500);

    console.log("Liked:", targetProfile.name || targetProfile.displayName);

    try {
      const targetId = targetProfile._id || targetProfile.id;
      if (!targetId) {
        console.error("Profile ID is missing.");
        return;
      }

      console.log("Calling recordInteraction with targetId:", targetId);
      
      // Temporarily disabled for testing
      const result = await recordInteraction(targetId, "LIKE");
      // const result = { match: null }; // Simulate no match for testing

      // Check if it's a mutual match
      if (result.match && result.match.isMutual) {
        // Show match alert
        setTimeout(() => {
          Alert.alert(
            "🎉 It's a Match!",
            `You and ${targetProfile.name || targetProfile.displayName} liked each other!`,
            [
              {
                text: "Send Message",
                onPress: () =>
                  navigation.navigate("Chat", {
                    user: targetProfile,
                    matchStatus: "active",
                    isInitiator: false,
                  }),
              },
              {
                text: "Keep Swiping",
                style: "cancel",
                onPress: () => {
                   if (isPendingMode) {
                      setIsPendingMode(false);
                      navigation.setParams({ pendingProfile: null });
                      setCurrentIndex(0);
                      loadProfiles();
                   } else {
                      setCurrentIndex((prev) => prev + 1);
                   }
                },
              },
            ]
          );
        }, 300);
      } else {
        if (isPendingMode) {
           setIsPendingMode(false);
           navigation.setParams({ pendingProfile: null });
           setCurrentIndex(0);
           loadProfiles();
        } else {
           setCurrentIndex((prev) => prev + 1);
        }
      }
    } catch (error) {
      console.error("Error recording like:", error);
    }
  };

  const handlePassFromSheet = () => {
    if (selectedProfile) {
      handleSwipeUp(selectedProfile);
    }
    setShowBottomSheet(false);
  };

  const toggleFilter = (filterType) => {
    setFilterState((prev) => {
      if (filterType === "verified") {
        return { ...prev, verified: !prev.verified };
      }
      // For distance and age, toggle between null and active
      // In a real implementation, you'd open a modal to set the value
      return { ...prev, [filterType]: prev[filterType] === null ? true : null };
    });
  };

  const currentProfile = profiles[currentIndex];

  if (loading) {
    return (
      <LinearGradient
        colors={theme.colors.gradients.background}
        style={[
          styles.gradient,
          { justifyContent: "center", alignItems: "center" },
        ]}
      >
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </LinearGradient>
    );
  }

  console.log("Current Profile:", currentProfile);

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
          colors={["rgba(255,255,255,0.2)", "transparent"]}
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
                <Ionicons
                  name="arrow-back"
                  size={28}
                  color={theme.colors.text.primary}
                />
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={styles.profileButton}
                onPress={() => navigation.navigate("Profile")}
              >
                <Ionicons
                  name="person-circle-outline"
                  size={32}
                  color={theme.colors.text.primary}
                />
              </TouchableOpacity>
            )}
          </View>

          {!isPendingMode && <Text style={styles.headerTitle}>Discover</Text>}

          <View style={styles.headerRight}>
            <TouchableOpacity
              style={styles.filterButton}
              onPress={() => setShowFilterModal(true)}
            >
              <Ionicons
                name="options-outline"
                size={24}
                color={theme.colors.text.primary}
              />
            </TouchableOpacity>
          </View>
        </LinearGradient>

        {/* Filter Bar removed, replaced by Date Pill placement concept */}

        {/* Card Stack */}
        <View style={styles.cardContainer}>
          {currentIndex < profiles.length ? (
            <ParallaxProfileCard
              key={currentProfile.id}
              data={currentProfile}
              onSwipeUp={handleSwipeUp}
              onCardPress={handleCardPress}
              disabled={showBottomSheet || showMatchModal || showSuperLikeModal}
              swipeAnimatedValue={swipeY} 
            />
          ) : (
            <View style={styles.noMoreCards}>
              <Text style={styles.noMoreCardsEmoji}>🎉</Text>
              <Text style={styles.noMoreCardsText}>You've seen everyone!</Text>
              <Text style={styles.noMoreCardsSubtext}>
                Check back later for more matches
              </Text>
              <GradientButton
                title="Refresh"
                onPress={() => {
                  setCurrentIndex(0);
                  loadProfiles();
                }}
                variant="primary"
                size="medium"
                icon={<Ionicons name="refresh" size={20} color="#FFF" />}
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
        onSuperLike={handleSuperLikePress}
        // Tutorial Props
        showTutorial={showTutorial}
        tutorialStep={tutorialStep}
        onTutorialNext={() => {
             // Called when user clicks "Next" inside the sheet (Step 1 -> 2)
             setShowBottomSheet(false);
             setTutorialStep(2);
        }}
      />

      {/* Match Comment Modal */}
      <MatchCommentModal
        visible={showMatchModal}
        profile={matchProfile}
        onClose={() => setShowMatchModal(false)}
        onSend={handleSendMatch}
      />

      {/* Super Like Modal */}
      <SuperLikeModal
        visible={showSuperLikeModal}
        profile={superLikeProfile}
        onClose={() => setShowSuperLikeModal(false)}
        onSend={handleSuperLike}
      />

      {/* Filter Modal */}
      <FilterModal
        visible={showFilterModal}
        filterState={filterState}
        onClose={() => setShowFilterModal(false)}
        onUpdateFilter={(newFilterState) => {
          setFilterState(newFilterState);
          // TODO: Apply filters to profile loading
        }}
      />

      {/* Date Proposal Drag & Drop Pill */}
      {currentIndex < profiles.length && !showBottomSheet && !isPendingMode && (
         <DateCallToAction 
            swipeAnimatedValue={swipeY} // Passed SharedValue
            onDrop={(resetFunc, dateOption) => {
               // Open Clean Modal instead of CustomAlert
               setSelectedDateOption(dateOption);
               setShowDateModal(true);
               // Store reset function to call after close/confirm if needed
               // For simplicity, we can let the pill snap back immediately or handle it here
               resetFunc();
            }}
         />
      )}
      
      {/* Date Confirmation Modal (Premium) */}
      <DateConfirmationModal 
          visible={showDateModal}
          dateOption={selectedDateOption}
          profileName={currentProfile?.displayName || "this user"}
          onClose={() => setShowDateModal(false)}
          onConfirm={() => {
              if (selectedDateOption) {
                  handleSendMatch(currentProfile, selectedDateOption.message);
              }
              setShowDateModal(false);
          }}
      />

      {/* Coachmark Guide (Premium) */}
      {/* 
         If tutorial step is 1 (Sheet View), we DON'T render here. 
         It's rendered INSIDE ProfileBottomSheet to be on top of the Modal. 
      */}
      {(!showBottomSheet || tutorialStep !== 1) && (
      <CoachmarkOverlay
        visible={showTutorial}
        step={tutorialStep}
        steps={[
            // Step 0: Card Tap
            {
                title: "Welcome to Discovery",
                message: "Tap on any card to view their full profile, photos, and interests. Swipe up to unmatch!",
                icon: "finger-print",
                position: "center"
            },
            // Step 1: Inside Sheet (Placeholder here, handled in ProfileBottomSheet)
            {
                title: "Make Your Move",
                message: "Use the buttons below to Match, Super Like, or Pass.",
                icon: "heart-circle",
                position: "bottom-sheet"
            },
            // Step 2: Instant Date (After Sheet Closes)
            {
                title: "Instant Date",
                message: "Drag the 'Action Pill' anytime to propose an instant coffee or dinner date!",
                icon: "flash",
                position: "pill"
            }
        ]}
        onNext={() => {
            // Manual Next (e.g. from "Got it" button)
            if (tutorialStep === 0) {
                // Determine profile to open
                const targetProfile = profiles.length > 0 ? profiles[currentIndex] : null;
                if (targetProfile) {
                    // Update state to open sheet
                     setTutorialStep(1); 
                     setSelectedProfile(targetProfile);
                     setShowBottomSheet(true);
                }
            } else if (tutorialStep === 1) {
                // This shouldn't be hit here if we hide it, but just in case
                setShowBottomSheet(false);
                setTutorialStep(2);
            } else {
                 setTutorialStep(tutorialStep + 1);
            }
        }}
        onComplete={async () => {
             setShowTutorial(false);
             if (userData?._id) {
                 await AsyncStorage.setItem(`hasSeenTutorial_${userData._id}`, 'true');
             }
        }}
      />
      )}
      
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
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 50,
    paddingHorizontal: 20,
    paddingBottom: 15,
  },
  headerLeft: {
    width: 40,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: "bold",
    color: theme.colors.text.primary,
    textShadowColor: "rgba(0, 0, 0, 0.3)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  headerRight: {
    width: 40,
    alignItems: "flex-end",
  },
  filterButton: {
    padding: 8,
    backgroundColor: "rgba(255,255,255,0.2)",
    borderRadius: 20,
  },
  cardContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 80, // Space for bottom actions if any, or general lift
    marginTop: 20,
  },
  noMoreCards: {
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  noMoreCardsEmoji: {
    fontSize: 60,
    marginBottom: 20,
  },
  noMoreCardsText: {
    fontSize: 24,
    fontWeight: "bold",
    color: theme.colors.text.primary,
    marginBottom: 10,
    textAlign: "center",
  },
  noMoreCardsSubtext: {
    fontSize: 16,
    color: theme.colors.text.secondary  ,
    textAlign: "center",
    marginBottom: 30,
  },
  refreshButton: {
    width: 200,
  },
  refreshText: {
    marginTop: 8,
    fontSize: 14,
    color: '#D4AF37',
    fontWeight: '600',
  },
});

export default MainScreen;
