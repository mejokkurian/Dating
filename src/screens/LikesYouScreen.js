import React, { useState, useCallback, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Image,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  Modal,
  TouchableWithoutFeedback,
  Dimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";

const { width } = Dimensions.get("window");
import { useFocusEffect } from "@react-navigation/native";
import { getMyMatches } from "../services/api/match";
import { useBadge } from "../context/BadgeContext";
import { useNetworkStatus } from "../hooks/useNetworkStatus";
import { useSubscription } from "../context/SubscriptionContext";
import { useTheme } from "../context/ThemeContext";
import InfoCard from "../components/InfoCard";

const LikesYouScreen = ({ navigation }) => {
  const { isPremium, showPaywall } = useSubscription();
  const { updateBadgeCounts } = useBadge();
  const { isOffline } = useNetworkStatus();
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [refreshSuccess, setRefreshSuccess] = useState(false);
  const [activeTab, setActiveTab] = useState("likes"); // 'likes' or 'waiting'
  const [showInfoTooltip, setShowInfoTooltip] = useState(false);

  // Ref to track last fetch time to prevent rapid refetching
  const lastFetchTime = React.useRef(0);
  const THROTTLE_MS = 15000; // 15 seconds cache

  useFocusEffect(
    useCallback(() => {
      // Determine if we should fetch:
      // 1. If no matches, fetch immediately
      // 2. If refreshing, fetch (handled by onRefresh)
      // 3. If enough time has passed since last fetch
      const now = Date.now();
      const shouldFetch =
        matches.length === 0 || now - lastFetchTime.current > THROTTLE_MS;

      if (shouldFetch) {
        loadMatches();
      }

      updateBadgeCounts();
    }, [updateBadgeCounts, matches.length]),
  );

  const loadMatches = async (force = false) => {
    // Don't attempt to load if offline
    if (isOffline) {
      setError({ message: "No internet connection", isOffline: true });
      setLoading(false);
      return;
    }

    try {
      if (matches.length === 0) setLoading(true);
      setError(null);

      const data = await getMyMatches();
      const pendingMatches = data.filter((match) => match.status === "pending");

      // Efficient update: Use shallow comparison for arrays
      // Compare lengths and IDs instead of full JSON.stringify
      const hasChanged =
        pendingMatches.length !== matches.length ||
        pendingMatches.some((match, index) => {
          const existingMatch = matches[index];
          return (
            !existingMatch ||
            (match.matchId || match._id) !==
              (existingMatch.matchId || existingMatch._id)
          );
        });

      if (hasChanged || force) {
        setMatches(pendingMatches);
        lastFetchTime.current = Date.now();
      }
    } catch (err) {
      if (__DEV__) {
        console.error("Load matches error:", err);
      }

      // Enhance error object with specific network error information
      let enhancedError = err;

      // Check for network errors
      if (!err.response) {
        if (err.code === "ECONNABORTED" || err.message?.includes("timeout")) {
          enhancedError = {
            ...err,
            isNetworkError: true,
            networkErrorType: "timeout",
            userMessage:
              "The request took too long. Please check your connection and try again.",
          };
        } else if (
          err.code === "ECONNREFUSED" ||
          err.message?.includes("Network Error")
        ) {
          enhancedError = {
            ...err,
            isNetworkError: true,
            networkErrorType: "connection",
            userMessage:
              "Unable to connect to the server. Please check your internet connection.",
          };
        } else if (err.message?.includes("Network request failed")) {
          enhancedError = {
            ...err,
            isNetworkError: true,
            networkErrorType: "network",
            userMessage:
              "Network request failed. Please check your internet connection and try again.",
          };
        }
      }

      setError(enhancedError);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    setRefreshSuccess(false);
    setError(null);

    try {
      await loadMatches(true); // Force update on manual refresh
      updateBadgeCounts();

      // Show success feedback if refresh was successful
      setRefreshSuccess(true);

      // Hide success message after 2 seconds
      setTimeout(() => {
        setRefreshSuccess(false);
      }, 2000);
    } catch (err) {
      // Error is already handled in loadMatches, but ensure it's set
      if (!error) {
        setError(err);
      }
    } finally {
      setRefreshing(false);
    }
  };

  const handleMatchPress = (match) => {
    if (activeTab === "likes") {
      if (match.isSuperLike) {
        // Super Like -> Chat screen (Accept/Decline flow)
        navigation.navigate("Chat", {
          user: {
            ...match.user,
            _id: match.user._id || match.user.id,
            name: match.user.displayName || match.user.name,
            displayName: match.user.displayName || match.user.name,
            image:
              match.user.photos?.[match.user.mainPhotoIndex ?? 0] ||
              match.user.photos?.[0],
            photos: match.user.photos || [],
            mainPhotoIndex: match.user.mainPhotoIndex ?? 0,
          },
          matchStatus: match.status,
          isInitiator: match.isInitiator,
          isSuperLike: match.isSuperLike,
          matchId: match.matchId || match._id,
          superLikeMessage: match.lastMessage?.content,
        });
      } else {
        // Normal Like -> View Profile (LikeProfileScreen)
        navigation.navigate("LikeProfile", {
          user: match.user,
          matchId: match.matchId || match._id, // Pass matchId needed for accept/decline actions
        });
      }
    } else {
      // For waiting tab
      navigation.navigate("LikeProfile", {
        user: match.user,
        isWaiting: true, // Flag to hide action buttons
      });
    }
  };

  // Memoize formatTime to prevent recreation on every render
  // This ensures stable reference when passed to MatchItem component
  const formatTime = useCallback((date) => {
    if (!date) return "";
    const messageDate = new Date(date);
    const now = new Date();
    const diffMs = now - messageDate;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays}d ago`;
    return messageDate.toLocaleDateString();
  }, []); // Empty deps - function doesn't depend on any props/state

  // Filter matches based on active tab (memoized for performance)
  const displayedMatches = useMemo(() => {
    return matches.filter((match) => {
      if (activeTab === "likes") {
        // Likes You: pending AND !isInitiator
        return !match.isInitiator;
      } else {
        // Waiting: pending AND isInitiator
        return match.isInitiator;
      }
    });
  }, [matches, activeTab]);

  // Memoize badge counts for performance
  const likesCount = useMemo(() => {
    return matches.filter((m) => !m.isInitiator).length;
  }, [matches]);

  const waitingCount = useMemo(() => {
    return matches.filter((m) => m.isInitiator).length;
  }, [matches]);

  // Separate component for match item to allow hooks
  const MatchItem = React.memo(
    ({ match, activeTab, onPress, formatTime, isLocked }) => {
      const [imageLoading, setImageLoading] = useState(true);
      const [imageError, setImageError] = useState(false);

      const imageUri =
        match.user.image ||
        (match.user.photos && match.user.photos.length > 0
          ? match.user.photos[match.user.mainPhotoIndex ?? 0] ||
            match.user.photos[0]
          : null) ||
        "https://via.placeholder.com/60";

      return (
        <TouchableOpacity
          style={[styles.matchItem, match.isSuperLike && styles.superLikeItem]}
          onPress={() => onPress(match)}
          activeOpacity={isLocked ? 1 : 0.7}
        >
          <View style={styles.avatarContainer}>
            {!imageError ? (
              <View style={styles.avatarImageContainer}>
                {imageLoading && (
                  <View style={styles.imageLoadingOverlay}>
                    <ActivityIndicator size="small" color="#D4AF37" />
                  </View>
                )}
                <Image
                  key={imageUri}
                  source={{ uri: imageUri }}
                  style={[
                    styles.matchAvatar,
                    match.isSuperLike && styles.superLikeAvatar,
                  ]}
                  resizeMode="cover"
                  onLoadStart={() => {
                    setImageLoading(true);
                    setImageError(false);
                  }}
                  onLoadEnd={() => {
                    setImageLoading(false);
                  }}
                  onError={() => {
                    setImageError(true);
                    setImageLoading(false);
                  }}
                />
              </View>
            ) : (
              <View style={[styles.matchAvatar, styles.placeholderAvatar]}>
                <Ionicons name="person" size={24} color="#ccc" />
              </View>
            )}
            {match.isSuperLike && (
              <View style={styles.superLikeStarBadge}>
                <Ionicons name="star" size={12} color="#FFF" />
              </View>
            )}
          </View>
          <View style={styles.matchContent}>
            <View style={styles.matchHeader}>
              <Text style={styles.matchName}>
                {match.user.name || match.user.displayName}
              </Text>
              <Text style={styles.matchTime}>
                {formatTime(match.lastMessageAt || match.createdAt)}
              </Text>
            </View>
            <View style={styles.likesYouContainer}>
              {activeTab === "likes" ? (
                <>
                  <Ionicons
                    name={match.isSuperLike ? "star" : "heart"}
                    size={14}
                    color="#D4AF37"
                  />
                  <Text style={styles.likesYouText}>
                    {match.isSuperLike ? "Adored you!" : "Liked you"}
                  </Text>
                </>
              ) : (
                <>
                  <Ionicons name="time-outline" size={14} color="#999" />
                  <Text style={styles.waitingText}>
                    Waiting for response...
                  </Text>
                </>
              )}
            </View>
            {match.lastMessage && (
              <Text style={styles.messagePreview} numberOfLines={1}>
                {match.lastMessage.content}
              </Text>
            )}
          </View>
          {activeTab === "likes" && !isLocked && (
            <View
              style={[
                styles.heartBadge,
                match.isSuperLike && styles.superLikeBadge,
              ]}
            >
              <Ionicons
                name={match.isSuperLike ? "star" : "heart"}
                size={18}
                color="#FFFFFF"
              />
            </View>
          )}

          {/* Blur overlay for free users on the Likes tab */}
          {isLocked && (
            <BlurView
              intensity={18}
              tint="light"
              style={StyleSheet.absoluteFill}
            >
              <View style={styles.lockedOverlay}>
                <Ionicons name="lock-closed" size={18} color="#B8860B" />
              </View>
            </BlurView>
          )}
        </TouchableOpacity>
      );
    },
  );

  // Free users can't see who liked them on the Likes tab
  const likesTabLocked = !isPremium && activeTab === "likes";

  const renderMatchItem = ({ item: match }) => (
    <MatchItem
      match={match}
      activeTab={activeTab}
      onPress={likesTabLocked ? () => showPaywall("likes") : handleMatchPress}
      formatTime={formatTime}
      isLocked={likesTabLocked}
    />
  );

  const renderInfoTooltip = () => (
    <Modal
      visible={showInfoTooltip}
      transparent
      animationType="fade"
      onRequestClose={() => setShowInfoTooltip(false)}
    >
      <TouchableWithoutFeedback onPress={() => setShowInfoTooltip(false)}>
        <View style={styles.tooltipOverlay}>
          <TouchableWithoutFeedback>
            <View style={styles.tooltipCard}>
              <LinearGradient
                colors={["#D4AF37", "#B8860B"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.tooltipAccent}
              />
              <View style={styles.tooltipBody}>
                <View style={styles.tooltipHeader}>
                  <Ionicons name="heart-circle" size={22} color="#D4AF37" />
                  <Text style={styles.tooltipTitle}>Activity</Text>
                  <TouchableOpacity
                    onPress={() => setShowInfoTooltip(false)}
                    style={styles.tooltipClose}
                  >
                    <Ionicons
                      name="close"
                      size={18}
                      color={colors.text.secondary}
                    />
                  </TouchableOpacity>
                </View>
                <Text style={styles.tooltipDesc}>
                  See who liked your profile and track who you've liked. Like
                  someone back to create a match!
                </Text>
                <View style={styles.tooltipDivider} />
                <View style={styles.tooltipFeatureRow}>
                  <Ionicons name="heart-outline" size={16} color="#D4AF37" />
                  <Text style={styles.tooltipFeatureText}>
                    Likes You — people who liked your profile
                  </Text>
                </View>
                <View style={styles.tooltipFeatureRow}>
                  <Ionicons name="time-outline" size={16} color="#D4AF37" />
                  <Text style={styles.tooltipFeatureText}>
                    Waiting — profiles you liked, awaiting response
                  </Text>
                </View>
                <View style={styles.tooltipFeatureRow}>
                  <Ionicons name="star-outline" size={16} color="#D4AF37" />
                  <Text style={styles.tooltipFeatureText}>
                    Adores go straight to chat
                  </Text>
                </View>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#D4AF37" />
        <Text style={styles.loadingText}>Loading matches...</Text>
        <Text style={styles.loadingSubtext}>
          Please wait while we fetch your activity
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {renderInfoTooltip()}
      <View style={styles.header}>
        <Text style={styles.title}>Activity</Text>
        <TouchableOpacity
          style={styles.subtitleRow}
          onPress={() => setShowInfoTooltip(true)}
          activeOpacity={0.7}
        >
          <Text style={styles.subtitleText}>Your likes &amp; connections</Text>
          <View style={styles.infoIconBadge}>
            <Ionicons name="information-circle" size={15} color="#D4AF37" />
          </View>
        </TouchableOpacity>
        {isOffline && (
          <View style={styles.offlineBanner}>
            <Ionicons name="cloud-offline-outline" size={16} color="#FFFFFF" />
            <Text style={styles.offlineBannerText}>No Internet Connection</Text>
          </View>
        )}
        {refreshSuccess && !isOffline && (
          <View style={styles.successBanner}>
            <Ionicons name="checkmark-circle" size={16} color="#FFFFFF" />
            <Text style={styles.successBannerText}>Refreshed successfully</Text>
          </View>
        )}
      </View>

      {/* Tab Bar */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === "likes" && styles.tabActive]}
          onPress={() => setActiveTab("likes")}
        >
          <View style={styles.tabContent}>
            <Text
              style={[
                styles.tabText,
                activeTab === "likes" && styles.tabTextActive,
              ]}
            >
              Likes You
            </Text>
            {likesCount > 0 && (
              <View style={styles.tabBadge}>
                <Text style={styles.tabBadgeText}>{likesCount}</Text>
              </View>
            )}
          </View>
          {activeTab === "likes" && <View style={styles.tabIndicator} />}
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === "waiting" && styles.tabActive]}
          onPress={() => setActiveTab("waiting")}
        >
          <View style={styles.tabContent}>
            <Text
              style={[
                styles.tabText,
                activeTab === "waiting" && styles.tabTextActive,
              ]}
            >
              Waiting
            </Text>
            {waitingCount > 0 && (
              <View style={styles.tabBadge}>
                <Text style={styles.tabBadgeText}>{waitingCount}</Text>
              </View>
            )}
          </View>
          {activeTab === "waiting" && <View style={styles.tabIndicator} />}
        </TouchableOpacity>
      </View>

      {error ? (
        <ScrollView
          contentContainerStyle={styles.emptyContainer}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >
          {error.isOffline ? (
            <>
              <Ionicons
                name="cloud-offline-outline"
                size={80}
                color="#FF5252"
              />
              <Text style={styles.emptyTitle}>No Internet Connection</Text>
              <Text style={styles.emptyText}>
                Please check your internet connection and try again.
              </Text>
            </>
          ) : (
            <>
              <Ionicons name="alert-circle-outline" size={80} color="#FF5252" />
              <Text style={styles.emptyTitle}>
                {error.isNetworkError
                  ? error.networkErrorType === "timeout"
                    ? "Connection Timeout"
                    : "No Connection"
                  : error.response?.status === 401
                    ? "Authentication Required"
                    : error.response?.status === 403
                      ? "Permission Denied"
                      : "Unable to Load Matches"}
              </Text>
              <Text style={styles.emptyText}>
                {error.isNetworkError
                  ? error.userMessage ||
                    "Please check your internet connection and try again."
                  : error.response?.status === 401
                    ? "Please log in again to view your matches."
                    : error.response?.status === 403
                      ? "You don't have permission to view matches."
                      : error.response?.status === 404
                        ? "Matches not found. Please try again."
                        : error.response?.status === 429
                          ? "Too many requests. Please wait a moment and try again."
                          : error.response?.status >= 500
                            ? "Our servers are experiencing issues. Please try again later."
                            : "Unable to load your matches. Please check your connection and try again."}
              </Text>
            </>
          )}
          <TouchableOpacity
            style={styles.retryButton}
            onPress={() => loadMatches(true)}
            disabled={isOffline}
          >
            <Text style={styles.retryButtonText}>Try Again</Text>
          </TouchableOpacity>
        </ScrollView>
      ) : displayedMatches.length === 0 ? (
        <ScrollView
          contentContainerStyle={styles.emptyContainer}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >
          {/* Icon ring */}
          <LinearGradient
            colors={["rgba(212,175,55,0.18)", "rgba(212,175,55,0.04)"]}
            style={styles.emptyIconRing}
          >
            <View style={styles.emptyIconInner}>
              <Ionicons
                name={
                  activeTab === "likes" ? "heart-outline" : "hourglass-outline"
                }
                size={52}
                color="#D4AF37"
              />
            </View>
          </LinearGradient>

          <Text style={styles.emptyTitle}>
            {activeTab === "likes" ? "No Likes Yet" : "No Pending Requests"}
          </Text>
          <Text style={styles.emptyText}>
            {activeTab === "likes"
              ? "Keep swiping to get more likes!"
              : "You haven't liked anyone yet. Start swiping!"}
          </Text>

          {/* Hint pills */}
          {activeTab === "likes" ? (
            <View style={styles.hintPillsRow}>
              <View style={styles.hintPill}>
                <Ionicons name="images-outline" size={14} color="#D4AF37" />
                <Text style={styles.hintPillText}>Add photos</Text>
              </View>
              <View style={styles.hintPill}>
                <Ionicons name="heart-outline" size={14} color="#D4AF37" />
                <Text style={styles.hintPillText}>Keep swiping</Text>
              </View>
              <View style={styles.hintPill}>
                <Ionicons name="star-outline" size={14} color="#D4AF37" />
                <Text style={styles.hintPillText}>Adore</Text>
              </View>
            </View>
          ) : (
            <View style={styles.hintPillsRow}>
              <View style={styles.hintPill}>
                <Ionicons name="heart-outline" size={14} color="#D4AF37" />
                <Text style={styles.hintPillText}>Like profiles</Text>
              </View>
              <View style={styles.hintPill}>
                <Ionicons name="star-outline" size={14} color="#D4AF37" />
                <Text style={styles.hintPillText}>Adore</Text>
              </View>
            </View>
          )}

          {/* Actionable suggestions */}
          {activeTab === "likes" ? (
            <View style={styles.tipsContainer}>
              <TouchableOpacity
                style={styles.emptyCtaButton}
                onPress={() => navigation.navigate("Discover")}
              >
                <LinearGradient
                  colors={["#F5C842", "#D4AF37", "#B8860B"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.emptyCtaGradient}
                >
                  <Ionicons name="heart" size={16} color="#0D0D0D" />
                  <Text style={styles.emptyCtaText}>Start Swiping</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.tipsContainer}>
              <InfoCard
                title="💡 Ready to make connections?"
                items={[
                  {
                    icon: "heart-outline",
                    text: "Like profiles you're interested in",
                  },
                  { icon: "star-outline", text: "Use Adore to stand out" },
                ]}
              />

              <TouchableOpacity
                style={styles.emptyCtaButton}
                onPress={() => navigation.navigate("Discover")}
              >
                <LinearGradient
                  colors={["#F5C842", "#D4AF37", "#B8860B"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.emptyCtaGradient}
                >
                  <Ionicons name="heart" size={16} color="#0D0D0D" />
                  <Text style={styles.emptyCtaText}>Start Swiping</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      ) : (
        <>
          {/* Locked banner — free users on Likes tab */}
          {likesTabLocked && displayedMatches.length > 0 && (
            <TouchableOpacity
              style={styles.lockedBanner}
              onPress={() => showPaywall("likes")}
              activeOpacity={0.85}
            >
              <Ionicons name="lock-closed" size={16} color="#fff" />
              <Text style={styles.lockedBannerText}>
                {displayedMatches.length}{" "}
                {displayedMatches.length === 1 ? "person" : "people"} liked you
                — upgrade to see who
              </Text>
              <Text style={styles.lockedBannerCta}>Unlock →</Text>
            </TouchableOpacity>
          )}
          <FlatList
            data={displayedMatches}
            renderItem={renderMatchItem}
            keyExtractor={(item) => item.matchId || item._id}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }
            contentContainerStyle={styles.listContent}
            removeClippedSubviews={true}
            maxToRenderPerBatch={10}
            updateCellsBatchingPeriod={50}
            initialNumToRender={10}
            windowSize={10}
            getItemLayout={(_data, index) => ({
              length: 92,
              offset: 92 * index,
              index,
            })}
          />
        </>
      )}
    </View>
  );
};

const makeStyles = (colors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
      paddingTop: 60,
    },
    loadingContainer: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      backgroundColor: colors.background,
      paddingHorizontal: 24,
    },
    loadingText: {
      marginTop: 16,
      fontSize: 18,
      fontWeight: "600",
      color: colors.text.primary,
      textAlign: "center",
    },
    loadingSubtext: {
      marginTop: 8,
      fontSize: 14,
      color: colors.text.secondary,
      textAlign: "center",
    },
    header: {
      paddingHorizontal: 24,
      marginBottom: 16,
    },
    title: {
      fontSize: 32,
      fontWeight: "800",
      color: colors.text.primary,
    },
    tabContainer: {
      flexDirection: "row",
      paddingHorizontal: 24,
      marginBottom: 16,
    },
    tab: {
      flex: 1,
      paddingVertical: 12,
      alignItems: "center",
      justifyContent: "center",
      position: "relative",
    },
    tabActive: {},
    tabContent: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
    },
    tabText: {
      fontSize: 16,
      fontWeight: "600",
      color: colors.text.tertiary,
    },
    tabTextActive: {
      color: "#D4AF37",
      fontWeight: "700",
    },
    tabIndicator: {
      position: "absolute",
      bottom: -1,
      left: 0,
      right: 0,
      height: 2,
      backgroundColor: "#D4AF37",
    },
    tabBadge: {
      backgroundColor: "#D4AF37",
      minWidth: 18,
      height: 18,
      borderRadius: 9,
      paddingHorizontal: 5,
      alignItems: "center",
      justifyContent: "center",
    },
    tabBadgeText: {
      color: "#FFFFFF",
      fontSize: 11,
      fontWeight: "700",
      textAlign: "center",
    },
    emptyContainer: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      paddingVertical: 80,
      paddingHorizontal: 40,
    },
    emptyTitle: {
      fontSize: 24,
      fontWeight: "700",
      color: colors.text.primary,
      marginTop: 20,
      marginBottom: 10,
    },
    emptyText: {
      fontSize: 16,
      color: colors.text.secondary,
      textAlign: "center",
      lineHeight: 24,
      marginBottom: 24,
    },
    emptySuggestions: {
      marginTop: 8,
      width: "100%",
      alignItems: "center",
    },
    tipsContainer: {
      width: "100%",
      alignSelf: "center",
      marginTop: 20,
      alignItems: "center",
    },
    startSwipingButton: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: "#D4AF37",
      paddingHorizontal: 24,
      paddingVertical: 14,
      borderRadius: 24,
      marginTop: 20,
      gap: 8,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.15,
      shadowRadius: 8,
      elevation: 4,
    },
    startSwipingButtonText: {
      color: "#FFFFFF",
      fontSize: 16,
      fontWeight: "700",
    },
    retryButton: {
      marginTop: 20,
      paddingHorizontal: 24,
      paddingVertical: 12,
      backgroundColor: "#D4AF37",
      borderRadius: 24,
    },
    retryButtonText: {
      color: "#FFFFFF",
      fontSize: 16,
      fontWeight: "600",
    },
    offlineBanner: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: "#FF5252",
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 16,
      marginTop: 8,
      alignSelf: "flex-start",
      gap: 6,
    },
    offlineBannerText: {
      color: "#FFFFFF",
      fontSize: 12,
      fontWeight: "600",
    },
    successBanner: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: "#4CAF50",
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 16,
      marginTop: 8,
      alignSelf: "flex-start",
      gap: 6,
    },
    successBannerText: {
      color: "#FFFFFF",
      fontSize: 12,
      fontWeight: "600",
    },
    listContent: {
      paddingBottom: 32,
    },
    matchItem: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 24,
      paddingVertical: 16,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    matchAvatar: {
      width: 60,
      height: 60,
      borderRadius: 30,
      marginRight: 16,
    },
    matchContent: {
      flex: 1,
    },
    matchHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      marginBottom: 4,
    },
    matchName: {
      fontSize: 16,
      fontWeight: "700",
      color: colors.text.primary,
    },
    matchTime: {
      fontSize: 12,
      color: colors.text.tertiary,
    },
    likesYouContainer: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
    },
    likesYouText: {
      fontSize: 13,
      color: colors.text.secondary,
      fontWeight: "500",
    },
    waitingText: {
      fontSize: 13,
      color: colors.text.tertiary,
      fontStyle: "italic",
    },
    heartBadge: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: "#D4AF37", // Gold
      alignItems: "center",
      justifyContent: "center",
      marginLeft: 8,
      shadowColor: "#D4AF37",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.3,
      shadowRadius: 3,
      elevation: 3,
    },
    superLikeItem: {
      backgroundColor: colors.surface,
    },
    avatarContainer: {
      position: "relative",
      marginRight: 16,
    },
    superLikeAvatar: {
      borderWidth: 2,
      borderColor: "#D4AF37",
    },
    superLikeStarBadge: {
      position: "absolute",
      bottom: -4,
      right: -4,
      backgroundColor: "#D4AF37",
      borderRadius: 10,
      width: 20,
      height: 20,
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 1.5,
      borderColor: "#FFF",
    },
    superLikeBadge: {
      backgroundColor: "#D4AF37",
      // Maybe add a glow effect or different shadow
      shadowColor: "#B8860B",
      shadowOpacity: 0.5,
    },
    messagePreview: {
      fontSize: 13,
      color: colors.text.secondary,
      marginTop: 2,
      fontStyle: "italic",
    },
    avatarImageContainer: {
      position: "relative",
    },
    imageLoadingOverlay: {
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: "rgba(255, 255, 255, 0.7)",
      justifyContent: "center",
      alignItems: "center",
      borderRadius: 30,
      zIndex: 1,
    },
    placeholderAvatar: {
      backgroundColor: colors.surface2,
      justifyContent: "center",
      alignItems: "center",
    },
    lockedBanner: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: "#B8860B",
      paddingHorizontal: 16,
      paddingVertical: 12,
      gap: 8,
      marginHorizontal: 16,
      marginBottom: 8,
      borderRadius: 12,
    },
    lockedBannerText: {
      flex: 1,
      color: "#fff",
      fontSize: 13,
      fontWeight: "600",
    },
    lockedBannerCta: {
      color: "#fff",
      fontSize: 13,
      fontWeight: "700",
    },
    lockedOverlay: {
      flex: 1,
      alignItems: "flex-end",
      justifyContent: "center",
      paddingRight: 16,
    },
    subtitleRow: {
      flexDirection: "row",
      alignItems: "center",
      marginTop: 3,
      gap: 5,
    },
    subtitleText: {
      fontSize: 13,
      color: colors.text.tertiary,
    },
    infoIconBadge: {
      justifyContent: "center",
      alignItems: "center",
    },
    emptyIconRing: {
      width: 130,
      height: 130,
      borderRadius: 65,
      justifyContent: "center",
      marginBottom: 24,
      borderWidth: 1,
      borderColor: "rgba(212,175,55,0.2)",
    },
    emptyIconInner: {
      alignItems: "center",
      justifyContent: "center",
    },
    hintPillsRow: {
      flexDirection: "row",
      justifyContent: "center",
      gap: 8,
      marginTop: 4,
      marginBottom: 20,
      paddingHorizontal: 8,
      flexWrap: "wrap",
    },
    hintPill: {
      flexDirection: "row",
      alignItems: "center",
      gap: 5,
      paddingHorizontal: 12,
      paddingVertical: 7,
      borderRadius: 20,
      backgroundColor: "rgba(212,175,55,0.1)",
      borderWidth: 1,
      borderColor: "rgba(212,175,55,0.22)",
    },
    hintPillText: {
      fontSize: 12,
      color: colors.text.secondary,
      fontWeight: "500",
    },
    emptyCtaButton: {
      borderRadius: 28,
      overflow: "hidden",
      marginTop: 20,
      shadowColor: "#D4AF37",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 10,
      elevation: 6,
    },
    emptyCtaGradient: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      paddingHorizontal: 32,
      paddingVertical: 14,
    },
    emptyCtaText: {
      fontSize: 15,
      fontWeight: "800",
      color: "#0D0D0D",
      letterSpacing: 0.2,
    },
    tooltipOverlay: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.6)",
      justifyContent: "flex-start",
      alignItems: "flex-start",
      paddingTop: 90,
      paddingHorizontal: 20,
    },
    tooltipCard: {
      backgroundColor: colors.card || colors.surface,
      borderRadius: 18,
      overflow: "hidden",
      width: width - 40,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.4,
      shadowRadius: 20,
      elevation: 12,
      borderWidth: 1,
      borderColor: "rgba(212,175,55,0.2)",
    },
    tooltipAccent: {
      height: 3,
      width: "100%",
    },
    tooltipBody: {
      padding: 18,
    },
    tooltipHeader: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: 10,
      gap: 8,
    },
    tooltipTitle: {
      flex: 1,
      fontSize: 16,
      fontWeight: "800",
      color: colors.text.primary,
      letterSpacing: -0.3,
    },
    tooltipClose: {
      width: 28,
      height: 28,
      borderRadius: 14,
      backgroundColor: colors.surface2 || colors.surface,
      alignItems: "center",
      justifyContent: "center",
    },
    tooltipDesc: {
      fontSize: 13,
      color: colors.text.secondary,
      lineHeight: 19,
      marginBottom: 14,
    },
    tooltipDivider: {
      height: 1,
      backgroundColor: "rgba(212,175,55,0.15)",
      marginBottom: 14,
    },
    tooltipFeatureRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      marginBottom: 10,
    },
    tooltipFeatureText: {
      fontSize: 13,
      color: colors.text.secondary,
      flex: 1,
      fontWeight: "500",
    },
  });

export default LikesYouScreen;
