import React, { useState, useCallback, useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  Image, 
  TouchableOpacity, 
  Dimensions,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../context/AuthContext';
import { getTopPicks } from '../services/api/match';
import { useNetworkStatus } from '../hooks/useNetworkStatus';
import { useSubscription } from '../context/SubscriptionContext';
import { sanitizeText } from '../utils/inputSanitization';
import * as topPicksAnalytics from '../services/topPicksAnalytics';

const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - 48) / 2;

// ProfileCard component with image loading optimization
const ProfileCard = React.memo(({ profile, onPress }) => {
  const [imageLoading, setImageLoading] = useState(true);
  const [imageError, setImageError] = useState(false);

  const imageUri = (profile.photos && profile.photos.length > 0 ? profile.photos[0] : null) || 'https://via.placeholder.com/400x600';
  const profileName = sanitizeText(profile.displayName || profile.name || 'Unknown');

  return (
    <TouchableOpacity 
      style={styles.card}
      onPress={onPress}
      accessible={true}
      accessibilityLabel={`Profile card for ${profileName}`}
      accessibilityHint="Double tap to view full profile"
      accessibilityRole="button"
    >
      {imageLoading && !imageError && (
        <View style={styles.imageLoadingOverlay}>
          <ActivityIndicator size="small" color="#D4AF37" />
        </View>
      )}
      {imageError ? (
        <View style={styles.imageErrorContainer}>
          <Ionicons name="person" size={40} color="#ccc" />
        </View>
      ) : (
        <Image 
          source={{ uri: imageUri }} 
          style={styles.image} 
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
      )}
      <View style={styles.matchBadge}>
        <Ionicons name="flame" size={12} color="#D4AF37" />
        <Text style={styles.matchText}>{profile.matchPercentage || 95}% Match</Text>
      </View>
      <View style={styles.cardContent}>
        <View style={styles.nameRow}>
          <Text style={styles.name}>
            {profileName}, {profile.age || 'N/A'}
          </Text>
          {profile.isOnline && <View style={styles.onlineDot} />}
        </View>
      </View>
    </TouchableOpacity>
  );
});

const TopPicksScreen = ({ navigation }) => {
  const { userData } = useAuth();
  const { isPremium, showPaywall } = useSubscription();
  const [picks, setPicks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [isFromCache, setIsFromCache] = useState(false);
  const { isOffline } = useNetworkStatus();
  
  // Rate limiting for profile taps
  const lastProfileTapTime = useRef(0);
  const PROFILE_TAP_DEBOUNCE_MS = 500; // 500ms debounce
  
  // Cache keys
  const CACHE_KEY = `top_picks_${userData?._id || 'anonymous'}`;
  const CACHE_TIMESTAMP_KEY = `top_picks_timestamp_${userData?._id || 'anonymous'}`;
  const CACHE_EXPIRY_MS = 5 * 60 * 1000; // 5 minutes

  // Track screen view
  useEffect(() => {
    topPicksAnalytics.trackTopPicksScreenView();
  }, []);

  // Track picks loaded
  useEffect(() => {
    if (!loading && picks.length > 0) {
      topPicksAnalytics.trackTopPicksLoaded(picks.length, 0);
    }
  }, [loading, picks.length]);

  // Load cached picks
  const loadCachedPicks = useCallback(async () => {
    try {
      const cachedData = await AsyncStorage.getItem(CACHE_KEY);
      const cachedTimestamp = await AsyncStorage.getItem(CACHE_TIMESTAMP_KEY);
      
      if (cachedData && cachedTimestamp) {
        const timestamp = parseInt(cachedTimestamp, 10);
        const now = Date.now();
        
        // Check if cache is still valid (within expiry time)
        if (now - timestamp < CACHE_EXPIRY_MS) {
          const parsedPicks = JSON.parse(cachedData);
          return parsedPicks;
        }
      }
    } catch (err) {
      if (__DEV__) {
        console.error('Error loading cached top picks:', err);
      }
    }
    return null;
  }, [CACHE_KEY, CACHE_TIMESTAMP_KEY]);

  // Save picks to cache
  const savePicksToCache = useCallback(async (picksToCache) => {
    try {
      await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(picksToCache));
      await AsyncStorage.setItem(CACHE_TIMESTAMP_KEY, Date.now().toString());
    } catch (err) {
      if (__DEV__) {
        console.error('Error saving top picks to cache:', err);
      }
    }
  }, [CACHE_KEY, CACHE_TIMESTAMP_KEY]);

  // Load cache on mount
  useEffect(() => {
    const loadCache = async () => {
      const cachedPicks = await loadCachedPicks();
      if (cachedPicks && cachedPicks.length > 0) {
        setPicks(cachedPicks);
        setIsFromCache(true);
        setLoading(false);
      }
    };
    loadCache();
  }, [loadCachedPicks]);

  useFocusEffect(
    useCallback(() => {
      fetchTopPicks();
    }, [])
  );

  const fetchTopPicks = async (force = false, useCache = true) => {
    // Load from cache first if available and not forcing refresh
    if (useCache && !force && picks.length === 0) {
      const cachedPicks = await loadCachedPicks();
      if (cachedPicks && cachedPicks.length > 0) {
        setPicks(cachedPicks);
        setIsFromCache(true);
        setLoading(false);
        // Still fetch fresh data in background
        fetchTopPicks(false, false);
        return;
      }
    }

    // Don't attempt to load if offline
    if (isOffline && !force) {
      // Try to restore from cache on offline
      const cachedPicks = await loadCachedPicks();
      if (cachedPicks && cachedPicks.length > 0) {
        setPicks(cachedPicks);
        setIsFromCache(true);
        setError({ 
          message: 'No internet connection', 
          isOffline: true,
          userMessage: 'Showing cached results. Please check your internet connection for fresh data.',
        });
      } else {
        setError({ 
          message: 'No internet connection', 
          isOffline: true,
          userMessage: 'Please check your internet connection and try again.',
        });
      }
      setLoading(false);
      topPicksAnalytics.trackAPICall(false, { message: 'Offline' }, { type: 'offline' });
      return;
    }

    const startTime = Date.now();
    try {
      setLoading(true);
      setError(null);
      setIsFromCache(false);
      const data = await getTopPicks();
      const loadTime = Date.now() - startTime;
      const picksData = data || [];
      setPicks(picksData);
      
      // Save to cache on success
      if (picksData.length > 0) {
        await savePicksToCache(picksData);
      }
      
      topPicksAnalytics.trackAPICall(true, null, { loadTime, count: picksData.length });
    } catch (err) {
      const loadTime = Date.now() - startTime;
      if (__DEV__) {
        console.error('Error fetching top picks:', err);
      }
      
      // Try to restore from cache on error
      const cachedPicks = await loadCachedPicks();
      if (cachedPicks && cachedPicks.length > 0) {
        setPicks(cachedPicks);
        setIsFromCache(true);
        // Show error but with cached data
        setError({
          ...err,
          hasCachedData: true,
          userMessage: 'Showing cached results. Unable to fetch fresh data.',
        });
      } else {
        // Enhance error object with specific network error information
        let enhancedError = err;
        
        // Check for network errors
        if (!err.response) {
          if (err.code === 'ECONNABORTED' || err.message?.includes('timeout')) {
            enhancedError = {
              ...err,
              isNetworkError: true,
              networkErrorType: 'timeout',
              userMessage: 'The request took too long. Please check your connection and try again.',
            };
          } else if (err.code === 'ECONNREFUSED' || err.message?.includes('Network Error')) {
            enhancedError = {
              ...err,
              isNetworkError: true,
              networkErrorType: 'connection',
              userMessage: 'Unable to connect to the server. Please check your internet connection.',
            };
          } else if (err.message?.includes('Network request failed')) {
            enhancedError = {
              ...err,
              isNetworkError: true,
              networkErrorType: 'network',
              userMessage: 'Network request failed. Please check your internet connection and try again.',
            };
          }
        }
        
        setError(enhancedError);
      }
      
      topPicksAnalytics.trackAPICall(false, err, { loadTime, errorType: err.networkErrorType || 'unknown' });
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    setError(null);
    try {
      await fetchTopPicks(true);
      topPicksAnalytics.trackRefresh(true);
    } catch (err) {
      topPicksAnalytics.trackRefresh(false, err);
      // Error is already handled in fetchTopPicks
    } finally {
      setRefreshing(false);
    }
  };

  const handleProfilePress = (profile) => {
    // Rate limiting: prevent rapid taps
    const now = Date.now();
    if (now - lastProfileTapTime.current < PROFILE_TAP_DEBOUNCE_MS) {
      return;
    }
    lastProfileTapTime.current = now;

    // Input validation
    if (!profile) {
      if (__DEV__) {
        console.error('Invalid profile: profile is null or undefined');
      }
      return;
    }

    const profileId = profile._id || profile.id;
    if (!profileId || typeof profileId !== 'string' || profileId.trim().length === 0) {
      if (__DEV__) {
        console.error('Invalid profile ID:', profileId);
      }
      return;
    }

    // Track profile view
    topPicksAnalytics.trackProfileView(profileId, {
      matchPercentage: profile.matchPercentage || 95,
      hasPhotos: profile.photos && profile.photos.length > 0,
    });

    navigation.navigate('TopPickProfile', {
      user: profile,
    });
  };

  // Error State (only show if no picks and not from cache)
  if (error && picks.length === 0 && !loading && !isFromCache) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Top Picks</Text>
          <Text style={styles.subtitle}>Curated just for you based on your preferences.</Text>
        </View>
        {isOffline && (
          <View style={styles.offlineBanner}>
            <Ionicons name="cloud-offline-outline" size={16} color="#FFFFFF" />
            <Text style={styles.offlineBannerText}>No Internet Connection</Text>
          </View>
        )}
        <ScrollView 
          contentContainerStyle={styles.errorContainer}
          showsVerticalScrollIndicator={false}
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
                  : 'Unable to Load Top Picks'}
              </Text>
              <Text style={styles.errorText}>
                {error.isNetworkError
                  ? error.userMessage || 'Please check your internet connection and try again.'
                  : error.response?.status === 401 
                  ? 'Please log in again to view top picks.'
                  : error.response?.status === 403
                  ? 'You don\'t have permission to view top picks.'
                  : error.response?.status === 404
                  ? 'Top picks not found. Please try again.'
                  : error.response?.status === 429
                  ? 'Too many requests. Please wait a moment and try again.'
                  : error.response?.status >= 500
                  ? 'Our servers are experiencing issues. Please try again later.'
                  : 'Unable to load top picks. Please check your connection and try again.'}
              </Text>
            </>
          )}
          <TouchableOpacity
            style={styles.retryButton}
            onPress={() => {
              const errorType = error.isNetworkError ? error.networkErrorType || 'network' : error.response?.status || 'unknown';
              topPicksAnalytics.trackErrorRetry(errorType);
              fetchTopPicks(true);
            }}
          >
            <Ionicons name="refresh" size={20} color="#FFFFFF" style={{ marginRight: 8 }} />
            <Text style={styles.retryButtonText}>Try Again</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Top Picks</Text>
        <Text style={styles.subtitle}>Curated just for you based on your preferences.</Text>
        {isFromCache && (
          <View style={styles.cacheIndicator}>
            <Ionicons name="time-outline" size={12} color="#666" />
            <Text style={styles.cacheIndicatorText}>Showing cached results</Text>
          </View>
        )}
      </View>

      {/* Offline Banner */}
      {isOffline && (
        <View style={styles.offlineBanner}>
          <Ionicons name="cloud-offline-outline" size={16} color="#FFFFFF" />
          <Text style={styles.offlineBannerText}>No Internet Connection</Text>
        </View>
      )}

      <ScrollView 
        contentContainerStyle={styles.grid} 
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#D4AF37"
          />
        }
      >
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#D4AF37" />
            <Text style={styles.loadingText}>Loading picks...</Text>
            <Text style={styles.loadingSubtext}>Please wait while we fetch your curated matches</Text>
          </View>
        ) : !isPremium ? (
          // ── Free tier gate ──────────────────────────────────────────────
          <View style={styles.gateContainer}>
            <View style={styles.gateIconBadge}>
              <Ionicons name="flash" size={36} color="#B8860B" />
            </View>
            <Text style={styles.gateTitle}>Top Picks</Text>
            <Text style={styles.gateSubtitle}>
              Your handpicked daily matches are waiting. Upgrade to Gold to see them.
            </Text>

            {/* Blurred placeholder cards */}
            <View style={styles.blurredCardsRow}>
              {[0, 1].map((i) => (
                <View key={i} style={[styles.card, styles.blurredCard]}>
                  <View style={styles.blurredCardInner}>
                    <Ionicons name="person" size={40} color="rgba(184,134,11,0.4)" />
                  </View>
                  <View style={styles.blurredOverlay}>
                    <Ionicons name="lock-closed" size={20} color="#B8860B" />
                  </View>
                </View>
              ))}
            </View>

            <TouchableOpacity
              style={styles.unlockButton}
              onPress={() => showPaywall('top_picks')}
              activeOpacity={0.85}
            >
              <LinearGradient
                colors={['#F5C842', '#B8860B']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.unlockButtonGradient}
              >
                <Ionicons name="flash" size={18} color="#fff" />
                <Text style={styles.unlockButtonText}>Unlock Top Picks</Text>
              </LinearGradient>
            </TouchableOpacity>
            <Text style={styles.gateCaption}>Available with Gold & Platinum plans</Text>
          </View>
        ) : picks.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="flame-outline" size={80} color="#D4AF37" />
            <Text style={styles.emptyTitle}>No Top Picks Available</Text>
            <Text style={styles.emptyText}>
              We're working on finding the perfect matches for you. Check back soon!
            </Text>
            <TouchableOpacity
              style={styles.retryButton}
              onPress={() => {
                topPicksAnalytics.trackEmptyStateAction('refresh');
                fetchTopPicks(true);
              }}
            >
              <Ionicons name="refresh" size={20} color="#FFFFFF" style={{ marginRight: 8 }} />
              <Text style={styles.retryButtonText}>Refresh</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {picks.map((profile) => (
              <ProfileCard
                key={profile._id || profile.id}
                profile={profile}
                onPress={() => handleProfilePress(profile)}
              />
            ))}
          </>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    paddingTop: 60,
  },
  header: {
    paddingHorizontal: 24,
    marginBottom: 24,
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    color: '#000000',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666666',
    lineHeight: 22,
  },
  grid: {
    paddingHorizontal: 16,
    paddingBottom: 100,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  card: {
    width: CARD_WIDTH,
    height: CARD_WIDTH * 1.4,
    borderRadius: 16,
    marginBottom: 16,
    backgroundColor: '#F5F5F5',
    overflow: 'hidden',
    position: 'relative',
  },
  image: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  matchBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  matchText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  cardContent: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 12,
    backgroundColor: 'rgba(0,0,0,0.4)', // Gradient overlay would be better but this works
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  name: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  onlineDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#4CAF50',
    borderWidth: 1,
    borderColor: '#FFFFFF',
  },
  upgradeCard: {
    width: '100%',
    padding: 24,
    backgroundColor: '#FAFAFA',
    borderRadius: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E5EA',
    marginTop: 8,
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    elevation: 4,
    borderWidth: 2,
    borderColor: '#D4AF37',
  },
  upgradeTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000000',
    marginBottom: 8,
  },
  upgradeSubtitle: {
    fontSize: 14,
    color: '#666666',
    textAlign: 'center',
    lineHeight: 20,
  },
  loadingContainer: {
    width: '100%',
    height: 300,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  loadingSubtext: {
    marginTop: 8,
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
    paddingBottom: 100,
    minHeight: 400,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333',
    marginTop: 20,
    marginBottom: 8,
    textAlign: 'center',
  },
  errorText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#D4AF37',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 25,
    minWidth: 150,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  emptyContainer: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333',
    marginTop: 20,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
  },
  offlineBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FF5252',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginTop: 8,
    marginHorizontal: 24,
    alignSelf: 'flex-start',
    gap: 6,
  },
  offlineBannerText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  cacheIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    gap: 4,
  },
  cacheIndicatorText: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
  },
  imageLoadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  imageErrorContainer: {
    width: '100%',
    height: '100%',
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  // ── Free tier gate styles ──
  gateContainer: {
    width: '100%',
    alignItems: 'center',
    paddingVertical: 32,
    paddingHorizontal: 24,
  },
  gateIconBadge: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#FFF8E1',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    borderWidth: 1.5,
    borderColor: '#F5C842',
  },
  gateTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#111',
    marginBottom: 8,
  },
  gateSubtitle: {
    fontSize: 15,
    color: '#777',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  blurredCardsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 28,
  },
  blurredCard: {
    backgroundColor: '#F5F0E8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  blurredCardInner: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  blurredOverlay: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(255,248,225,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
  },
  unlockButton: {
    width: '100%',
    borderRadius: 14,
    overflow: 'hidden',
    marginBottom: 12,
    shadowColor: '#B8860B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  unlockButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 8,
  },
  unlockButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  gateCaption: {
    fontSize: 12,
    color: '#AAA',
  },
});

export default TopPicksScreen;
