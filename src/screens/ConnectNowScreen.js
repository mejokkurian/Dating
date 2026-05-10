import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Switch,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Dimensions,
  Image,
  Platform,
  Linking,
  Modal,
  TouchableWithoutFeedback,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { useLocationTracking } from '../hooks/useLocationTracking';
import { useProximityMatching } from '../hooks/useProximityMatching';
import { toggleConnectNow, updateLocationPrivacy, sendQuickHello } from '../services/api/connectNow';
import { respondToMatch } from '../services/api/match';
import socketService from '../services/socket';
import NearbyUserCard from '../components/NearbyUserCard';
import PrivacyConsentModal from '../components/PrivacyConsentModal';
import QuickHelloModal from '../components/QuickHelloModal';
import NotificationBottomSheet from '../components/NotificationBottomSheet';
import { useTheme } from '../context/ThemeContext';
import GlassCard from '../components/GlassCard';
import MapView, { Marker, Callout } from 'react-native-maps';
import ConnectNowGuideBottomSheet from '../components/ConnectNowGuideBottomSheet';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { clusterMarkers, getAdaptiveThreshold } from '../utils/mapClustering';
import { useNetworkStatus } from '../hooks/useNetworkStatus';
import * as connectNowAnalytics from '../services/connectNowAnalytics';
import { CONNECT_NOW_ERRORS, getErrorMessage } from '../constants/errorMessages';

const { width, height } = Dimensions.get('window');

const ConnectNowScreen = ({ navigation }) => {
  const { userData, setUserData } = useAuth();
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  const [connectNowEnabled, setConnectNowEnabled] = useState(false);
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);
  const [showQuickHelloModal, setShowQuickHelloModal] = useState(false);
  const [showHelloSuccessSheet, setShowHelloSuccessSheet] = useState(false);
  const [successUser, setSuccessUser] = useState(null);
  const [selectedUser, setSelectedUser] = useState(null);
  const [hasAcceptedPrivacy, setHasAcceptedPrivacy] = useState(false);
  const [privacySettings, setPrivacySettings] = useState({
    showExactDistance: true,
    shareLocation: true,
  });
  const [loading, setLoading] = useState(false);
  const [sendingHello, setSendingHello] = useState(false);
  const [activeTab, setActiveTab] = useState('nearby'); // 'nearby' or 'requests'
  const [viewMode, setViewMode] = useState('list'); // 'list' or 'map'
  const [showGuideSheet, setShowGuideSheet] = useState(false);
  const [showInfoTooltip, setShowInfoTooltip] = useState(false);
  
  // Rate limiting for Quick Hello
  const quickHelloTimestampsRef = useRef([]);
  const QUICK_HELLO_RATE_LIMIT = 5; // Max 5 per minute
  const QUICK_HELLO_RATE_WINDOW = 60000; // 1 minute in milliseconds

  // Network status monitoring
  const { isOffline, socketConnected } = useNetworkStatus();
  
  // Track offline state changes
  useEffect(() => {
    connectNowAnalytics.trackOfflineState(isOffline);
  }, [isOffline]);

  // Track screen view
  useEffect(() => {
    connectNowAnalytics.trackConnectNowScreenView();
  }, []);

  // Check if first time viewing Connect Now
  useEffect(() => {
    const checkFirstTime = async () => {
      try {
        const hasSeenGuide = await AsyncStorage.getItem('hasSeenConnectNowGuide');
        if (hasSeenGuide !== 'true') {
          // Add a small delay for smoother UX
          setTimeout(() => {
            setShowGuideSheet(true);
          }, 500);
        }
      } catch (error) {
        console.error('Error checking first time status:', error);
        connectNowAnalytics.trackConnectNowScreenView({ error: error.message });
      }
    };
    
    checkFirstTime();
  }, []);

  const handleGuideClose = async () => {
      setShowGuideSheet(false);
      try {
          await AsyncStorage.setItem('hasSeenConnectNowGuide', 'true');
      } catch (error) {
          console.error('Error saving guide status:', error);
      }
  };

  // Location tracking hook
  const {
    location,
    permissionStatus,
    error: locationError,
    requestPermissions,
  } = useLocationTracking(connectNowEnabled);

  // Proximity matching hook
  const {
    nearbyUsers,
    loading: nearbyUsersLoading,
    error: nearbyUsersError,
    refreshNearbyUsers,
  } = useProximityMatching(connectNowEnabled);

  // Filter users based on active tab (memoized for performance)
  const nearbyUsersFiltered = useMemo(() => {
    return nearbyUsers.filter(user => {
      const hasPendingRequest = user.matchStatus === 'pending';
      
      if (activeTab === 'nearby') {
        // Show users without pending requests
        return !hasPendingRequest;
      } else {
        // Show users with pending requests (incoming or outgoing)
        return hasPendingRequest;
      }
    });
  }, [nearbyUsers, activeTab]);

  // Count users for badges (memoized for performance)
  const nearbyCount = useMemo(() => {
    return nearbyUsers.filter(u => u.matchStatus !== 'pending').length;
  }, [nearbyUsers]);

  const requestsCount = useMemo(() => {
    return nearbyUsers.filter(u => u.matchStatus === 'pending').length;
  }, [nearbyUsers]);

  // Load initial state
  useEffect(() => {
    if (userData) {
      setConnectNowEnabled(userData.connectNowEnabled || false);
      if (userData.locationPrivacy) {
        setPrivacySettings({
          showExactDistance: userData.locationPrivacy.showExactDistance !== false,
          shareLocation: userData.locationPrivacy.shareLocation !== false,
        });
      }
    }
  }, [userData]);

  // Connect to socket and set up listeners (handles reconnection)
  useEffect(() => {
    let isMounted = true;
    
    // Define listener callbacks (stable references)
    const handleConnectNowToggled = (data) => {
      if (isMounted) {
        setConnectNowEnabled(data.enabled);
      }
    };

    const handleLocationError = (error) => {
      if (isMounted) {
        const errorMessage = getErrorMessage(error, CONNECT_NOW_ERRORS.LOCATION_UPDATE_FAILED);
        Alert.alert('Location Update', errorMessage);
      }
    };

    // Set up socket listeners immediately
    // These are registered in activeListeners and will be automatically re-attached on reconnect
    socketService.onConnectNowToggled(handleConnectNowToggled);
    socketService.onLocationError(handleLocationError);

    const setupSocket = async () => {
      try {
        // Connect socket (will reconnect automatically if disconnected)
        // Listeners are already registered above and will be attached when socket connects
        await socketService.connect();
      } catch (error) {
        console.error('Error setting up socket:', error);
        if (isMounted) {
          // Don't block UI, but log the error
        }
      }
    };

    // Initial connection
    setupSocket();

    return () => {
      isMounted = false;
      try {
        // Remove listeners on cleanup
        socketService.removeListener('connect_now_toggled');
        socketService.removeListener('location_error');
      } catch (error) {
        // Ignore cleanup errors
      }
    };
  }, []);

  // Handle Connect Now toggle
  const handleToggleConnectNow = async (enabled) => {
    const startTime = Date.now();
    
    // If disabling, proceed immediately
    if (!enabled) {
      try {
        setLoading(true);
        await toggleConnectNow(enabled);
        setConnectNowEnabled(enabled);
        socketService.toggleConnectNow(enabled);
        
        const duration = Date.now() - startTime;
        connectNowAnalytics.trackConnectNowToggle(false, { duration, success: true });
      } catch (error) {
        console.error('Error toggling Connect Now:', error);
        const duration = Date.now() - startTime;
        connectNowAnalytics.trackConnectNowToggle(false, { duration, success: false, error: error.message });
        Alert.alert('Error', 'Failed to update Connect Now settings');
      } finally {
        setLoading(false);
      }
      return;
    }

    // If enabling, check prerequisites first
    if (enabled && !connectNowEnabled) {
      // Check if we need to show privacy consent
      if (!userData?.locationPrivacy && !hasAcceptedPrivacy) {
        // Don't change toggle state yet - wait for modal acceptance
        setShowPrivacyModal(true);
        return;
      }

      // Request location permission (alert is handled inside requestPermissions)
      const hasPermission = await requestPermissions(true);
      if (!hasPermission) {
        // Permission request failed - the alert is already shown by requestPermissions
        // Just return without showing another alert to avoid duplicate messages
        return;
      }
    }

    // All checks passed, enable Connect Now
    try {
      setLoading(true);
      await toggleConnectNow(enabled);
      setConnectNowEnabled(enabled);
      socketService.toggleConnectNow(enabled);
      
      const duration = Date.now() - startTime;
      connectNowAnalytics.trackConnectNowToggle(true, { duration, success: true });
    } catch (error) {
      console.error('Error toggling Connect Now:', error);
      const duration = Date.now() - startTime;
      connectNowAnalytics.trackConnectNowToggle(true, { duration, success: false, error: error.message });
      const errorMessage = getErrorMessage(error, CONNECT_NOW_ERRORS.TOGGLE_ENABLE_FAILED);
      Alert.alert('Connect Now', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Handle privacy consent acceptance
  const handlePrivacyAccept = async () => {
    try {
      await updateLocationPrivacy(
        privacySettings.showExactDistance,
        privacySettings.shareLocation
      );
      
      // Update local userData context to prevent modal from reopening
      setHasAcceptedPrivacy(true);
      setUserData({
        ...userData,
        locationPrivacy: {
          showExactDistance: privacySettings.showExactDistance,
          shareLocation: privacySettings.shareLocation,
        },
      });
      
      setShowPrivacyModal(false);
      
      // Now enable Connect Now (requestPermissions shows its own alert if denied)
      const hasPermission = await requestPermissions(true);
      if (hasPermission) {
        await handleToggleConnectNow(true);
      } else {
        // Permission denied - user was already shown alert in requestPermissions
        // Don't proceed with enabling Connect Now
      }
    } catch (error) {
      console.error('Error updating privacy settings:', error);
      const errorMessage = getErrorMessage(error, CONNECT_NOW_ERRORS.PRIVACY_SAVE_FAILED);
      Alert.alert('Privacy Settings', errorMessage);
    }
  };

  // Handle privacy settings change
  const handlePrivacySettingsChange = (newSettings) => {
    setPrivacySettings(newSettings);
  };

  // Handle say hello
  const handleSayHello = (user) => {
    // Check if duplicate or active match
    const isMatched = user.matchStatus === 'active' || user.hasMatch;
    
    if (isMatched) {
      navigation.navigate('Chat', {
        user: user,
        matchStatus: 'active',
        isInitiator: false, // Assuming if listed here and matched, we can talk
      });
      return;
    }

    setSelectedUser(user);
    setShowQuickHelloModal(true);
  };

  // Check rate limit for Quick Hello
  const checkQuickHelloRateLimit = () => {
    const now = Date.now();
    const windowStart = now - QUICK_HELLO_RATE_WINDOW;
    
    // Remove timestamps outside the rate limit window
    quickHelloTimestampsRef.current = quickHelloTimestampsRef.current.filter(
      timestamp => timestamp > windowStart
    );
    
    // Check if limit exceeded
    if (quickHelloTimestampsRef.current.length >= QUICK_HELLO_RATE_LIMIT) {
      const oldestTimestamp = quickHelloTimestampsRef.current[0];
      const waitTime = Math.ceil((oldestTimestamp + QUICK_HELLO_RATE_WINDOW - now) / 1000);
      return {
        allowed: false,
        waitTime, // seconds to wait
        remaining: 0,
      };
    }
    
    return { 
      allowed: true,
      remaining: QUICK_HELLO_RATE_LIMIT - quickHelloTimestampsRef.current.length,
    };
  };

  // Handle send quick hello
  const handleSendQuickHello = async (user, message) => {
    if (sendingHello) return; // Prevent duplicate sends
    
    // Check rate limit
    const rateLimitCheck = checkQuickHelloRateLimit();
    if (!rateLimitCheck.allowed) {
      Alert.alert(
        'Rate Limit',
        CONNECT_NOW_ERRORS.QUICK_HELLO_RATE_LIMIT(rateLimitCheck.waitTime),
        [{ text: 'OK' }]
      );
      
      // Track rate limit hit
      connectNowAnalytics.trackQuickHelloSent(false, null, 0, new Error('Rate limit exceeded'), {
        messageLength: message.length,
        rateLimitHit: true,
      });
      return;
    }
    
    const startTime = Date.now();
    
    try {
      setSendingHello(true);
      
      // Record this send attempt
      quickHelloTimestampsRef.current.push(startTime);
      
      const response = await sendQuickHello(user._id, message);
      const matchStatus = response.matchStatus || user.matchStatus || 'pending';
      const isActiveMatch = matchStatus === 'active';
      
      const duration = Date.now() - startTime;
      
      // Close modal first
      setShowQuickHelloModal(false);
      setSelectedUser(null);
      
      // If match is already active, navigate directly to chat
      if (isActiveMatch) {
        navigation.navigate('Chat', {
          user: user,
          matchStatus: 'active',
          isInitiator: false,
        });
      } else {
        // For pending or new matches, show success sheet
        setSuccessUser(user);
        setShowHelloSuccessSheet(true);
        
        // Update the user in the list to reflect the new status immediately
        if (response.initiatorId) {
             refreshNearbyUsers(); 
        }
      }
      
      // Track successful send
      connectNowAnalytics.trackQuickHelloSent(true, matchStatus, duration, null, {
        messageLength: message.length,
        isActiveMatch,
      });
    } catch (error) {
      console.error('Error sending quick hello:', error);
      const duration = Date.now() - startTime;
      connectNowAnalytics.trackQuickHelloSent(false, null, duration, error, {
        messageLength: message.length,
      });
      const errorMessage = getErrorMessage(error, CONNECT_NOW_ERRORS.QUICK_HELLO_SEND_FAILED);
      Alert.alert('Send Message', errorMessage);
      // Don't close modal on error so user can retry
    } finally {
      setSendingHello(false);
    }
  };

  // Handle pending request press (for outgoing requests)
  const handlePendingRequestPress = (user) => {
    navigation.navigate('Chat', {
      user: user,
      matchStatus: 'pending',
      isInitiator: true, // Sender of the request
    });
  };

  // Handle view profile
  const handleViewProfile = (user) => {
    connectNowAnalytics.trackProfileView({ 
      userId: user._id,
      hasMatch: user.hasMatch || false,
      matchStatus: user.matchStatus || null,
    });
    
    navigation.navigate('LikeProfile', {
      user: user,
      matchId: user.matchId || null,
      fromConnectNow: true, // Flag to hide Like/Pass buttons
    });
  };

  // Handle accept match
  const handleAcceptMatch = async (user) => {
    const startTime = Date.now();
    
    try {
      setLoading(true);
      await respondToMatch(user.matchId, 'accept');
      
      const duration = Date.now() - startTime;
      connectNowAnalytics.trackMatchResponse('accept', true, duration);
      
      // Navigate to chat
      navigation.navigate('Chat', {
        user: user,
        matchStatus: 'active',
        isInitiator: false,
        });
      
      // Refresh list to update status
      refreshNearbyUsers();
    } catch (error) {
      console.error('Error accepting match:', error);
      const duration = Date.now() - startTime;
      connectNowAnalytics.trackMatchResponse('accept', false, duration, error);
      const errorMessage = getErrorMessage(error, CONNECT_NOW_ERRORS.MATCH_ACCEPT_FAILED);
      Alert.alert('Accept Invitation', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Handle decline match
  const handleDeclineMatch = async (user) => {
    const startTime = Date.now();
    
    try {
      setLoading(true);
      await respondToMatch(user.matchId, 'decline');
      
      const duration = Date.now() - startTime;
      connectNowAnalytics.trackMatchResponse('decline', true, duration);
      
      // Refresh list to remove user
      refreshNearbyUsers();
    } catch (error) {
      console.error('Error declining match:', error);
      const duration = Date.now() - startTime;
      connectNowAnalytics.trackMatchResponse('decline', false, duration, error);
      const errorMessage = getErrorMessage(error, CONNECT_NOW_ERRORS.MATCH_DECLINE_FAILED);
      Alert.alert('Decline Invitation', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const mapRef = useRef(null);
  const [mapRegion, setMapRegion] = useState(null);
  const hasInitializedMapRef = useRef(false);
  const [mapReady, setMapReady] = useState(false);

  // Reset map ready state when switching to map view
  useEffect(() => {
    if (viewMode === 'map') {
      setMapReady(false);
    }
  }, [viewMode]);

  // Focus map on current location initially (only once, not on every view mode change)
  useEffect(() => {
    if (viewMode === 'map' && location && mapRef.current && !hasInitializedMapRef.current) {
        const initialRegion = {
            latitude: location.latitude,
            longitude: location.longitude,
            latitudeDelta: 0.05,
            longitudeDelta: 0.05,
        };
        setMapRegion(initialRegion);
        mapRef.current.animateToRegion(initialRegion, 1000);
        hasInitializedMapRef.current = true;
    }
  }, [viewMode, location]);

  // Prepare markers for clustering
  const mapMarkers = useMemo(() => {
    const markers = nearbyUsersFiltered
      .map(user => {
        const locationData = user.lastLocation || user.location;
        if (!locationData || !locationData.coordinates) return null;
        
        return {
          coordinate: {
            latitude: locationData.coordinates[1],
            longitude: locationData.coordinates[0],
          },
          data: user,
        };
      })
      .filter(Boolean);

    // Only cluster if we have more than 20 markers
    if (markers.length <= 20) {
      return markers.map(marker => ({
        ...marker,
        isCluster: false,
        clusterCount: 1,
      }));
    }

    // Use adaptive threshold based on current zoom level
    const threshold = mapRegion 
      ? getAdaptiveThreshold(mapRegion.latitudeDelta)
      : 100;

    return clusterMarkers(markers, threshold, 20);
  }, [nearbyUsersFiltered, mapRegion]);


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
                colors={['#D4AF37', '#B8860B']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.tooltipAccent}
              />
              <View style={styles.tooltipBody}>
                <View style={styles.tooltipHeader}>
                  <Ionicons name="navigate-circle" size={22} color="#D4AF37" />
                  <Text style={styles.tooltipTitle}>Connect Now</Text>
                  <TouchableOpacity onPress={() => setShowInfoTooltip(false)} style={styles.tooltipClose}>
                    <Ionicons name="close" size={18} color={colors.text.secondary} />
                  </TouchableOpacity>
                </View>
                <Text style={styles.tooltipDesc}>
                  Discover people around you in real-time. When active, your anonymized location is shared so nearby members can find you.
                </Text>
                <View style={styles.tooltipDivider} />
                <View style={styles.tooltipFeatureRow}>
                  <Ionicons name="shield-checkmark-outline" size={16} color="#D4AF37" />
                  <Text style={styles.tooltipFeatureText}>Exact location is never revealed</Text>
                </View>
                <View style={styles.tooltipFeatureRow}>
                  <Ionicons name="flash-outline" size={16} color="#D4AF37" />
                  <Text style={styles.tooltipFeatureText}>Send Quick Hellos to break the ice</Text>
                </View>
                <View style={styles.tooltipFeatureRow}>
                  <Ionicons name="toggle-outline" size={16} color="#D4AF37" />
                  <Text style={styles.tooltipFeatureText}>Toggle off anytime to go invisible</Text>
                </View>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );

  const renderHeader = () => (
    <View style={styles.headerContainer}>
      <View>
        <Text style={styles.screenTitle}>Connect Now</Text>
        <TouchableOpacity
          style={styles.subtitleRow}
          onPress={() => setShowInfoTooltip(true)}
          activeOpacity={0.7}
        >
          <Text style={styles.screenSubtitle}>Nearby Connections</Text>
          <View style={styles.infoIconBadge}>
            <Ionicons name="information-circle" size={15} color="#D4AF37" />
          </View>
        </TouchableOpacity>
        {isOffline && (
          <View style={styles.offlineBanner}>
            <Ionicons name="cloud-offline-outline" size={14} color="#FF5252" />
            <Text style={styles.offlineBannerText}>No internet connection</Text>
          </View>
        )}
      </View>
      <View style={styles.headerRight}>
        <View style={[
          styles.toggleWrapper,
          connectNowEnabled && styles.toggleWrapperActive,
        ]}>
            {loading ? (
                <ActivityIndicator size="small" color="#D4AF37" style={{ marginRight: 8 }} />
            ) : (
                <Text style={[
                    styles.toggleLabel,
                    { color: connectNowEnabled ? '#D4AF37' : colors.text.secondary }
                ]}>
                    {connectNowEnabled ? 'Active' : 'Offline'}
                </Text>
            )}
            <Switch
                value={connectNowEnabled}
                onValueChange={(value) => {
                  if (showPrivacyModal) return;
                  if (isOffline) {
                    Alert.alert(
                      'No Internet Connection',
                      'Please check your internet connection and try again.',
                      [{ text: 'OK' }]
                    );
                    return;
                  }
                  handleToggleConnectNow(value);
                }}
                disabled={loading || showPrivacyModal || isOffline}
                trackColor={{ false: '#333', true: '#D4AF37' }}
                thumbColor={connectNowEnabled ? '#fff' : '#888'}
                ios_backgroundColor="#333"
                style={{ transform: [{ scale: 0.85 }] }}
            />
        </View>
      </View>
      {renderInfoTooltip()}
    </View>
  );

  const renderViewToggle = () => (
     <View style={styles.viewToggleContainer}>
        <View style={styles.segmentedControl}>
            <TouchableOpacity 
                style={[styles.segmentOption, viewMode === 'list' && styles.segmentActive]}
                onPress={() => {
                  if (viewMode !== 'list') {
                    connectNowAnalytics.trackViewModeChange('list');
                  }
                  setViewMode('list');
                }}
            >
                <Ionicons name="list" size={18} color={viewMode === 'list' ? '#fff' : '#666'} />
                <Text style={[styles.segmentText, viewMode === 'list' && styles.segmentTextActive]}>List</Text>
            </TouchableOpacity>
            <TouchableOpacity 
                style={[styles.segmentOption, viewMode === 'map' && styles.segmentActive]}
                onPress={() => {
                  if (viewMode !== 'map') {
                    connectNowAnalytics.trackViewModeChange('map');
                  }
                  setViewMode('map');
                }}
            >
                <Ionicons name="map" size={18} color={viewMode === 'map' ? '#fff' : '#666'} />
                <Text style={[styles.segmentText, viewMode === 'map' && styles.segmentTextActive]}>Map</Text>
            </TouchableOpacity>
        </View>

        {/* Tab Filter if in List Mode */}
        {viewMode === 'list' && (
            <View style={styles.tabFilterContainer}>
                 <TouchableOpacity 
                    style={[styles.filterTab, activeTab === 'nearby' && styles.filterTabActive]}
                    onPress={() => {
                      if (activeTab !== 'nearby') {
                        connectNowAnalytics.trackTabFilterChange('nearby', { count: nearbyCount });
                      }
                      setActiveTab('nearby');
                    }}
                 >
                    <Text style={[styles.filterText, activeTab === 'nearby' && styles.filterTextActive]}>Nearby ({nearbyCount})</Text>
                 </TouchableOpacity>
                 <TouchableOpacity 
                    style={[styles.filterTab, activeTab === 'requests' && styles.filterTabActive]}
                    onPress={() => {
                      if (activeTab !== 'requests') {
                        connectNowAnalytics.trackTabFilterChange('requests', { count: requestsCount });
                      }
                      setActiveTab('requests');
                    }}
                 >
                    <Text style={[styles.filterText, activeTab === 'requests' && styles.filterTextActive]}>Requests ({requestsCount})</Text>
                 </TouchableOpacity>
            </View>
        )}
     </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {renderHeader()}
      
      {connectNowEnabled ? (
          <>
            {renderViewToggle()}

            {viewMode === 'map' ? (
                 <View style={styles.mapContainer}>
                    {location ? (
                        <MapView
                            ref={mapRef}
                            style={styles.map}
                            initialRegion={mapRegion || {
                                latitude: location.latitude,
                                longitude: location.longitude,
                                latitudeDelta: 0.05,
                                longitudeDelta: 0.05,
                            }}
                            region={mapRegion || {
                                latitude: location.latitude,
                                longitude: location.longitude,
                                latitudeDelta: 0.05,
                                longitudeDelta: 0.05,
                            }}
                            onRegionChangeComplete={(region) => {
                                setMapRegion(region);
                            }}
                            onMapReady={() => {
                                setMapReady(true);
                            }}
                            onError={(error) => {
                                console.error('Map error:', error);
                                setMapReady(false);
                            }}
                            showsUserLocation={false}
                            loadingEnabled={true}
                        >
                            {/* Current User Marker */}
                            {location && userData && (
                                <Marker
                                    coordinate={{
                                        latitude: location.latitude,
                                        longitude: location.longitude,
                                    }}
                                    title="Me"
                                    zIndex={999}
                                >
                                    <View style={styles.markerContainer}>
                                        <View style={[styles.markerContent, { borderColor: '#D4AF37', borderWidth: 2 }]}>
                                            <Image 
                                                source={{ uri: userData.photos && userData.photos[0] ? userData.photos[0] : 'https://via.placeholder.com/150' }} 
                                                style={styles.markerImage} 
                                            />
                                            <Text style={styles.markerName}>Me</Text>
                                        </View>
                                        <View style={styles.markerArrow} />
                                    </View>
                                </Marker>
                            )}

                            {mapMarkers.map((marker, index) => {
                                const user = marker.data;
                                const key = marker.isCluster ? `cluster-${index}` : user._id;
                                
                                if (marker.isCluster) {
                                    // Render cluster marker
                                    return (
                                        <Marker
                                            key={key}
                                            coordinate={marker.coordinate}
                                            title={`${marker.clusterCount} people nearby`}
                                            onPress={() => {
                                                connectNowAnalytics.trackMapInteraction('cluster_tap', {
                                                    clusterCount: marker.clusterCount,
                                                });
                                                // Zoom in when cluster is pressed
                                                if (mapRef.current && mapRegion) {
                                                    mapRef.current.animateToRegion({
                                                        latitude: marker.coordinate.latitude,
                                                        longitude: marker.coordinate.longitude,
                                                        latitudeDelta: mapRegion.latitudeDelta * 0.5,
                                                        longitudeDelta: mapRegion.longitudeDelta * 0.5,
                                                    }, 500);
                                                }
                                            }}
                                        >
                                            <View style={styles.clusterContainer}>
                                                <View style={styles.clusterContent}>
                                                    <Text style={styles.clusterText}>{marker.clusterCount}</Text>
                                                </View>
                                            </View>
                                        </Marker>
                                    );
                                } else {
                                    // Render individual marker
                                    return (
                                        <Marker
                                            key={key}
                                            coordinate={marker.coordinate}
                                            title={user.displayName || user.name}
                                            description={user.distanceDisplay ? `${user.distanceDisplay} away` : ''}
                                            onCalloutPress={() => {
                                              connectNowAnalytics.trackMapInteraction('marker_tap', {
                                                userId: user._id,
                                              });
                                              handleViewProfile(user);
                                            }}
                                        >
                                            <View style={styles.markerContainer}>
                                                <View style={styles.markerContent}>
                                                    <Image 
                                                        source={{ uri: user.image || (user.photos && user.photos[0]) }} 
                                                        style={styles.markerImage} 
                                                    />
                                                    <Text style={styles.markerName} numberOfLines={1}>
                                                        {user.displayName || user.name}
                                                    </Text>
                                                </View>
                                                <View style={styles.markerArrow} />
                                            </View>
                                        </Marker>
                                    );
                                }
                            })}
                        </MapView>
                    ) : (
                        <View style={styles.centered}>
                             <ActivityIndicator size="large" color="#D4AF37" />
                             {permissionStatus === 'denied' ? (
                                 <>
                                     <Ionicons name="location-outline" size={48} color="#FF5252" style={{ marginBottom: 12 }} />
                                     <Text style={styles.loadingText}>Location Permission Required</Text>
                                     <Text style={styles.loadingSubtext}>
                                         Please enable location access in your device settings to use the map view.
                                     </Text>
                                     <TouchableOpacity
                                         style={styles.settingsButton}
                                         onPress={async () => {
                                             try {
                                                 if (Platform.OS === 'ios') {
                                                     await Linking.openURL('app-settings:');
                                                 } else {
                                                     await Linking.openSettings();
                                                 }
                                             } catch (error) {
                                                 console.error('Error opening settings:', error);
                                             }
                                         }}
                                     >
                                         <Ionicons name="settings-outline" size={18} color="#fff" style={{ marginRight: 6 }} />
                                         <Text style={styles.settingsButtonText}>Open Settings</Text>
                                     </TouchableOpacity>
                                 </>
                             ) : (
                                 <>
                                     <Ionicons name="location-outline" size={48} color="#D4AF37" style={{ marginBottom: 12 }} />
                                     <Text style={styles.loadingText}>Locating you...</Text>
                                     <Text style={styles.loadingSubtext}>
                                         Getting your current location to show on the map.
                                     </Text>
                                 </>
                             )}
                        </View>
                    )}
                    
                    {/* Show loading overlay when map is ready but still loading */}
                    {location && !mapReady && (
                        <View style={styles.mapLoadingOverlay}>
                            <View style={styles.mapLoadingContent}>
                                <ActivityIndicator size="small" color="#D4AF37" />
                                <Text style={styles.mapLoadingText}>Loading map...</Text>
                            </View>
                        </View>
                    )}
                    
                    {/* Floating Overlay for count */}
                    <View style={styles.mapOverlay}>
                        <GlassCard style={styles.mapOverlayCard}>
                           <Text style={styles.mapOverlayText}>
                               {nearbyUsersFiltered.length} {nearbyUsersFiltered.length === 1 ? 'person' : 'people'} found
                               {mapMarkers.some(m => m.isCluster) && ` (${mapMarkers.length} clusters)`}
                           </Text>
                        </GlassCard>
                    </View>
                 </View>
            ) : (
                /* List View */
                <View style={styles.listContainer}>
                    {isOffline ? (
                        <View style={styles.emptyContainer}>
                             <Ionicons name="cloud-offline-outline" size={64} color="#FF5252" />
                             <Text style={styles.emptyTitle}>No Internet Connection</Text>
                             <Text style={styles.emptySub}>
                                 Please check your internet connection and try again.
                             </Text>
                             <TouchableOpacity
                                 style={styles.retryButton}
                                 onPress={() => {
                                   // Try to reconnect socket
                                   socketService.connect();
                                 }}
                             >
                                 <Text style={styles.retryButtonText}>Retry Connection</Text>
                             </TouchableOpacity>
                        </View>
                    ) : nearbyUsersError ? (
                        <View style={styles.emptyContainer}>
                             <Ionicons name="alert-circle-outline" size={64} color="#FF5252" />
                             <Text style={styles.emptyTitle}>Unable to Load Users</Text>
                             <Text style={styles.emptySub}>
                                 {getErrorMessage({ message: nearbyUsersError }, CONNECT_NOW_ERRORS.NEARBY_USERS_LOAD_FAILED)}
                             </Text>
                             <TouchableOpacity
                                 style={styles.retryButton}
                                 onPress={refreshNearbyUsers}
                             >
                                 <Text style={styles.retryButtonText}>Try Again</Text>
                             </TouchableOpacity>
                        </View>
                    ) : nearbyUsersLoading && nearbyUsers.length === 0 ? (
                        <View style={styles.loadingContainer}>
                             <ActivityIndicator size="large" color="#D4AF37" />
                             <Text style={styles.loadingText}>Searching area...</Text>
                        </View>
                    ) : nearbyUsersFiltered.length === 0 ? (
                        <View style={styles.emptyContainer}>
                            {/* Premium icon ring */}
                            <LinearGradient
                                colors={['rgba(212,175,55,0.18)', 'rgba(212,175,55,0.04)']}
                                style={styles.emptyIconRing}
                            >
                                <View style={styles.emptyIconInner}>
                                    <Ionicons
                                        name={activeTab === 'nearby' ? 'navigate-circle-outline' : 'mail-unread-outline'}
                                        size={52}
                                        color="#D4AF37"
                                    />
                                </View>
                            </LinearGradient>

                            <Text style={styles.emptyTitle}>
                                {activeTab === 'nearby' ? 'No one nearby yet' : 'No pending requests'}
                            </Text>
                            <Text style={styles.emptySub}>
                                {activeTab === 'nearby'
                                    ? "We'll notify you the moment someone comes your way."
                                    : "You're all caught up. Explore the Nearby tab to connect."}
                            </Text>

                            {/* Hint pills row */}
                            {activeTab === 'nearby' && (
                                <View style={styles.hintPillsRow}>
                                    <View style={styles.hintPill}>
                                        <Ionicons name="walk-outline" size={14} color="#D4AF37" />
                                        <Text style={styles.hintPillText}>Move around</Text>
                                    </View>
                                    <View style={styles.hintPill}>
                                        <Ionicons name="time-outline" size={14} color="#D4AF37" />
                                        <Text style={styles.hintPillText}>Check back later</Text>
                                    </View>
                                    <View style={styles.hintPill}>
                                        <Ionicons name="location-outline" size={14} color="#D4AF37" />
                                        <Text style={styles.hintPillText}>Enable location</Text>
                                    </View>
                                </View>
                            )}

                            {/* CTA button */}
                            {activeTab === 'nearby' ? (
                                <TouchableOpacity
                                    style={styles.emptyCtaButton}
                                    onPress={refreshNearbyUsers}
                                    disabled={nearbyUsersLoading}
                                    activeOpacity={0.85}
                                >
                                    <LinearGradient
                                        colors={['#F5C842', '#D4AF37', '#B8860B']}
                                        start={{ x: 0, y: 0 }}
                                        end={{ x: 1, y: 0 }}
                                        style={styles.emptyCtaGradient}
                                    >
                                        <Ionicons name="refresh" size={16} color="#0D0D0D" />
                                        <Text style={styles.emptyCtaText}>
                                            {nearbyUsersLoading ? 'Refreshing…' : 'Refresh Now'}
                                        </Text>
                                    </LinearGradient>
                                </TouchableOpacity>
                            ) : (
                                <TouchableOpacity
                                    style={styles.emptyCtaButton}
                                    onPress={() => {
                                        connectNowAnalytics.trackTabFilterChange('nearby', { count: nearbyCount });
                                        setActiveTab('nearby');
                                    }}
                                    activeOpacity={0.85}
                                >
                                    <LinearGradient
                                        colors={['#F5C842', '#D4AF37', '#B8860B']}
                                        start={{ x: 0, y: 0 }}
                                        end={{ x: 1, y: 0 }}
                                        style={styles.emptyCtaGradient}
                                    >
                                        <Ionicons name="people" size={16} color="#0D0D0D" />
                                        <Text style={styles.emptyCtaText}>Explore Nearby</Text>
                                    </LinearGradient>
                                </TouchableOpacity>
                            )}
                        </View>
                    ) : (
                        <FlatList
                            data={nearbyUsersFiltered}
                            keyExtractor={(item) => item._id}
                            renderItem={({ item }) => (
                                <NearbyUserCard
                                    user={item}
                                    onSayHello={() => handleSayHello(item)}
                                    onViewProfile={() => handleViewProfile(item)}
                                    onPendingRequestPress={() => handlePendingRequestPress(item)}
                                    onAccept={() => handleAcceptMatch(item)}
                                    onDecline={() => handleDeclineMatch(item)}
                                />
                            )}
                            contentContainerStyle={styles.listContent}
                            refreshControl={
                                <RefreshControl
                                    refreshing={nearbyUsersLoading}
                                    onRefresh={refreshNearbyUsers}
                                    tintColor="#D4AF37"
                                />
                            }
                            // Performance optimizations
                            removeClippedSubviews={true}
                            maxToRenderPerBatch={10}
                            updateCellsBatchingPeriod={50}
                            initialNumToRender={10}
                            windowSize={10}
                            getItemLayout={(data, index) => ({
                                length: 100, // Estimated card height (padding 16*2 + margin 8*2 + content ~60)
                                offset: 100 * index,
                                index,
                            })}
                        />
                    )}
                </View>
            )}
          </>
      ) : (
          /* Offline State */
          <View style={styles.offlineContainer}>
              <LinearGradient
                colors={['rgba(212,175,55,0.15)', 'rgba(212,175,55,0.04)']}
                style={styles.offlineIconCircle}
              >
                <View style={styles.offlineIconInner}>
                  <Ionicons name="navigate-circle" size={72} color="#D4AF37" />
                </View>
              </LinearGradient>
              <Text style={styles.offlineTitle}>Connect Now</Text>
              <Text style={styles.offlineDesc}>
                  Discover members around you in real-time. Turn on visibility to see who's nearby and let them find you.
              </Text>

              <View style={styles.offlineFeatures}>
                <View style={styles.offlineFeatureRow}>
                  <Ionicons name="shield-checkmark" size={15} color="#D4AF37" />
                  <Text style={styles.offlineFeatureText}>Privacy protected — no exact location</Text>
                </View>
                <View style={styles.offlineFeatureRow}>
                  <Ionicons name="flash" size={15} color="#D4AF37" />
                  <Text style={styles.offlineFeatureText}>Send Quick Hellos to nearby people</Text>
                </View>
              </View>

              <TouchableOpacity
                style={styles.enableButton}
                onPress={() => handleToggleConnectNow(true)}
                activeOpacity={0.85}
              >
                <LinearGradient
                  colors={['#F5C842', '#D4AF37', '#B8860B']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.enableButtonGradient}
                >
                  <Text style={styles.enableButtonText}>Start Discovering</Text>
                  <Ionicons name="arrow-forward" size={18} color="#0D0D0D" />
                </LinearGradient>
              </TouchableOpacity>
          </View>
      )}
      {/* Modals */}
      <PrivacyConsentModal
        visible={showPrivacyModal}
        onClose={() => {
          setShowPrivacyModal(false);
          // Ensure toggle state is reset if modal is closed without accepting
          // The toggle should remain in its current state (off) since we prevented the change
        }}
        onAccept={handlePrivacyAccept}
        privacySettings={privacySettings}
        onPrivacySettingsChange={handlePrivacySettingsChange}
      />

      <QuickHelloModal
        visible={showQuickHelloModal}
        onClose={() => {
          if (!sendingHello) {
            setShowQuickHelloModal(false);
            setSelectedUser(null);
          }
        }}
        onSend={handleSendQuickHello}
        user={selectedUser}
        loading={sendingHello}
        rateLimitInfo={checkQuickHelloRateLimit()}
      />

      <NotificationBottomSheet
        visible={showHelloSuccessSheet}
        onClose={() => setShowHelloSuccessSheet(false)}
        type="success"
        title="Hello Sent!"
        message={successUser ? `Your message has been sent to ${successUser.displayName || successUser.name}.` : "Your message has been sent."}
        buttonText="View Chat"
        onButtonPress={() => {
          setShowHelloSuccessSheet(false);
          if (successUser) {
             navigation.navigate('Chat', {
              user: successUser,
              matchStatus: 'pending',
              isInitiator: true, 
            });
          }
        }}
        secondaryButtonText="Close"
        onSecondaryButtonPress={() => setShowHelloSuccessSheet(false)}
      />

      <ConnectNowGuideBottomSheet 
        visible={showGuideSheet}
        onClose={handleGuideClose}
      />
    </SafeAreaView>
  );
};

const makeStyles = (colors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: colors.background,
  },
  screenTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: colors.text.primary,
    letterSpacing: -0.8,
  },
  subtitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 3,
    gap: 5,
  },
  screenSubtitle: {
    fontSize: 13,
    color: colors.text.tertiary,
    fontWeight: '500',
  },
  infoIconBadge: {
    width: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerRight: {
      flexDirection: 'row',
      alignItems: 'center',
  },
  toggleWrapper: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.surface2 || colors.surface,
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: 22,
      borderWidth: 1,
      borderColor: colors.border,
  },
  toggleWrapperActive: {
      borderColor: 'rgba(212,175,55,0.5)',
      backgroundColor: 'rgba(212,175,55,0.08)',
  },
  toggleLabel: {
      fontSize: 12,
      fontWeight: '700',
      marginRight: 4,
      marginLeft: 2,
      letterSpacing: 0.3,
  },
  // Tooltip styles
  tooltipOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.6)',
      justifyContent: 'flex-start',
      alignItems: 'flex-start',
      paddingTop: 90,
      paddingHorizontal: 20,
  },
  tooltipCard: {
      backgroundColor: colors.card || colors.surface,
      borderRadius: 18,
      overflow: 'hidden',
      width: width - 40,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.4,
      shadowRadius: 20,
      elevation: 12,
      borderWidth: 1,
      borderColor: 'rgba(212,175,55,0.2)',
  },
  tooltipAccent: {
      height: 3,
      width: '100%',
  },
  tooltipBody: {
      padding: 18,
  },
  tooltipHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 10,
      gap: 8,
  },
  tooltipTitle: {
      flex: 1,
      fontSize: 16,
      fontWeight: '800',
      color: colors.text.primary,
      letterSpacing: -0.3,
  },
  tooltipClose: {
      width: 28,
      height: 28,
      borderRadius: 14,
      backgroundColor: colors.surface2 || colors.surface,
      alignItems: 'center',
      justifyContent: 'center',
  },
  tooltipDesc: {
      fontSize: 13,
      color: colors.text.secondary,
      lineHeight: 19,
      marginBottom: 14,
  },
  tooltipDivider: {
      height: 1,
      backgroundColor: 'rgba(212,175,55,0.15)',
      marginBottom: 14,
  },
  tooltipFeatureRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      marginBottom: 10,
  },
  tooltipFeatureText: {
      fontSize: 13,
      color: colors.text.secondary,
      flex: 1,
      fontWeight: '500',
  },
  viewToggleContainer: {
     paddingTop: 14,
     paddingBottom: 10,
     paddingHorizontal: 20,
     backgroundColor: colors.background,
     zIndex: 10,
  },
  segmentedControl: {
      flexDirection: 'row',
      backgroundColor: colors.surface2 || '#1a1a1a',
      borderRadius: 14,
      padding: 4,
      borderWidth: 1,
      borderColor: 'rgba(212,175,55,0.12)',
  },
  segmentOption: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 9,
      borderRadius: 11,
      gap: 6,
  },
  segmentActive: {
      backgroundColor: '#D4AF37',
      shadowColor: '#D4AF37',
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.35,
      shadowRadius: 6,
      elevation: 4,
  },
  segmentText: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.text.secondary,
  },
  segmentTextActive: {
      color: '#0D0D0D',
      fontWeight: '700',
  },
  tabFilterContainer: {
      flexDirection: 'row',
      marginTop: 15,
  },
  filterTab: {
      marginRight: 28,
      paddingBottom: 10,
  },
  filterTabActive: {
      borderBottomWidth: 2,
      borderBottomColor: '#D4AF37',
  },
  filterText: {
      fontSize: 15,
      fontWeight: '600',
      color: colors.text.tertiary,
  },
  filterTextActive: {
      color: '#D4AF37',
      fontWeight: '700',
  },
  mapContainer: {
      flex: 1,
      overflow: 'hidden',
  },
  map: {
      width: '100%',
      height: '100%',
  },
  markerContainer: {
      alignItems: 'center',
  },
  markerContent: {
      alignItems: 'center',
      backgroundColor: colors.card,
      padding: 4,
      borderRadius: 12,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.2,
      shadowRadius: 4,
      elevation: 4,
  },
  markerImage: {
      width: 40,
      height: 40,
      borderRadius: 20,
      borderWidth: 2,
      borderColor: '#D4AF37',
  },
  markerName: {
      fontSize: 10,
      fontWeight: '700',
      color: colors.text.primary,
      marginTop: 4,
      maxWidth: 80,
  },
  markerArrow: {
      width: 0,
      height: 0,
      backgroundColor: 'transparent',
      borderStyle: 'solid',
      borderLeftWidth: 6,
      borderRightWidth: 6,
      borderTopWidth: 8,
      borderLeftColor: 'transparent',
      borderRightColor: 'transparent',
      borderTopColor: colors.card,
      marginTop: -2,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.2,
      shadowRadius: 2,
  },
  clusterContainer: {
      alignItems: 'center',
      justifyContent: 'center',
  },
  clusterContent: {
      width: 50,
      height: 50,
      borderRadius: 25,
      backgroundColor: '#D4AF37',
      borderWidth: 3,
      borderColor: '#fff',
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.3,
      shadowRadius: 4,
      elevation: 5,
  },
  clusterText: {
      color: '#fff',
      fontSize: 16,
      fontWeight: '700',
  },
  mapOverlay: {
      position: 'absolute',
      top: 20,
      alignSelf: 'center',
  },
  mapOverlayCard: {
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: 20,
      backgroundColor: colors.tabBarFill,
  },
  mapOverlayText: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.text.primary,
  },
  centered: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: 40,
  },
  loadingText: {
      fontSize: 18,
      fontWeight: '600',
      color: colors.text.primary,
      marginTop: 12,
      textAlign: 'center',
  },
  loadingSubtext: {
      fontSize: 14,
      color: colors.text.secondary,
      marginTop: 8,
      textAlign: 'center',
      paddingHorizontal: 20,
  },
  settingsButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 20,
      paddingVertical: 12,
      paddingHorizontal: 24,
      borderRadius: 25,
      backgroundColor: '#D4AF37',
  },
  settingsButtonText: {
      fontSize: 15,
      fontWeight: '600',
      color: '#fff',
  },
  mapLoadingOverlay: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: colors.overlay,
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 1000,
  },
  mapLoadingContent: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.card,
      paddingVertical: 12,
      paddingHorizontal: 20,
      borderRadius: 25,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 3,
  },
  mapLoadingText: {
      fontSize: 14,
      color: colors.text.secondary,
      marginLeft: 8,
      fontWeight: '500',
  },
  listContainer: {
      flex: 1,
      backgroundColor: colors.background,
  },
  listContent: {
      paddingBottom: 20,
      paddingTop: 10,
  },
  loadingContainer: {
      paddingTop: 50,
      alignItems: 'center',
  },
  emptyContainer: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 36,
      paddingBottom: 80,
  },
  emptyTitle: {
      fontSize: 20,
      fontWeight: '800',
      color: colors.text.primary,
      marginBottom: 8,
      letterSpacing: -0.4,
  },
  emptySub: {
      fontSize: 14,
      color: colors.text.tertiary,
      textAlign: 'center',
      lineHeight: 20,
      marginBottom: 22,
      paddingHorizontal: 8,
  },
  emptyIconRing: {
      width: 130,
      height: 130,
      borderRadius: 65,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 24,
      borderWidth: 1,
      borderColor: 'rgba(212,175,55,0.2)',
  },
  emptyIconInner: {
      alignItems: 'center',
      justifyContent: 'center',
  },
  hintPillsRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'center',
      gap: 8,
      marginTop: 4,
      marginBottom: 28,
      paddingHorizontal: 8,
  },
  hintPill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      paddingHorizontal: 12,
      paddingVertical: 7,
      borderRadius: 20,
      backgroundColor: 'rgba(212,175,55,0.1)',
      borderWidth: 1,
      borderColor: 'rgba(212,175,55,0.22)',
  },
  hintPillText: {
      fontSize: 12,
      fontWeight: '600',
      color: '#D4AF37',
  },
  emptyCtaButton: {
      borderRadius: 28,
      overflow: 'hidden',
      shadowColor: '#D4AF37',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 10,
      elevation: 6,
  },
  emptyCtaGradient: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      paddingHorizontal: 32,
      paddingVertical: 14,
  },
  emptyCtaText: {
      fontSize: 15,
      fontWeight: '800',
      color: '#0D0D0D',
      letterSpacing: 0.2,
  },
  offlineContainer: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      padding: 32,
      backgroundColor: colors.background,
  },
  offlineIconCircle: {
      width: 148,
      height: 148,
      borderRadius: 74,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 30,
      borderWidth: 1,
      borderColor: 'rgba(212,175,55,0.2)',
  },
  offlineIconInner: {
      alignItems: 'center',
      justifyContent: 'center',
  },
  offlineTitle: {
      fontSize: 26,
      fontWeight: '800',
      color: colors.text.primary,
      marginBottom: 10,
      letterSpacing: -0.5,
  },
  offlineDesc: {
      fontSize: 14,
      color: colors.text.secondary,
      textAlign: 'center',
      lineHeight: 21,
      marginBottom: 24,
      paddingHorizontal: 8,
  },
  offlineFeatures: {
      width: '100%',
      marginBottom: 36,
      gap: 10,
  },
  offlineFeatureRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      paddingHorizontal: 8,
  },
  offlineFeatureText: {
      fontSize: 13,
      color: colors.text.secondary,
      fontWeight: '500',
  },
  enableButton: {
      borderRadius: 32,
      overflow: 'hidden',
      shadowColor: '#D4AF37',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.35,
      shadowRadius: 12,
      elevation: 8,
  },
  enableButtonGradient: {
      flexDirection: 'row',
      paddingHorizontal: 36,
      paddingVertical: 16,
      alignItems: 'center',
      gap: 10,
  },
  enableButtonText: {
    color: '#0D0D0D',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  retryButton: {
    marginTop: 20,
    backgroundColor: '#D4AF37',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 20,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  offlineBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 4,
  },
  offlineBannerText: {
    fontSize: 12,
    color: '#FF5252',
    fontWeight: '500',
  },
});

export default ConnectNowScreen;

