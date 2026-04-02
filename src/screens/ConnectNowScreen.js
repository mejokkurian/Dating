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
} from 'react-native';
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
import theme from '../theme/theme';
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


  const renderHeader = () => (
    <View style={styles.headerContainer}>
      <View>
        <Text style={styles.screenTitle}>Connect Now</Text>
        <Text style={styles.screenSubtitle}>Nearby Connections</Text>
        {isOffline && (
          <View style={styles.offlineBanner}>
            <Ionicons name="cloud-offline-outline" size={14} color="#FF5252" />
            <Text style={styles.offlineBannerText}>No internet connection</Text>
          </View>
        )}
      </View>
      <View style={styles.headerRight}>
        {/* Connection Toggle */}
        <View style={styles.toggleWrapper}>
            {loading ? (
                <ActivityIndicator size="small" color="#D4AF37" style={{ marginRight: 8 }} />
            ) : (
                <Text style={[
                    styles.toggleLabel, 
                    { color: connectNowEnabled ? theme.colors.success : '#666' }
                ]}>
                    {connectNowEnabled ? 'Active' : 'Offline'}
                </Text>
            )}
            <Switch
                value={connectNowEnabled}
                onValueChange={(value) => {
                  // Prevent toggle change if modal is showing or offline
                  if (showPrivacyModal) {
                    return;
                  }
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
                trackColor={{ false: '#e0e0e0', true: '#D4AF37' }}
                thumbColor="#fff"
                ios_backgroundColor="#e0e0e0"
                style={{ transform: [{ scale: 0.8 }] }}
            />
        </View>
      </View>
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
                             <Ionicons 
                                name={activeTab === 'nearby' ? "people-outline" : "mail-unread-outline"} 
                                size={64} 
                                color="#ddd" 
                             />
                             <Text style={styles.emptyTitle}>
                                {activeTab === 'nearby' ? "No one around yet" : "No pending requests"}
                             </Text>
                             <Text style={styles.emptySub}>
                                {activeTab === 'nearby' 
                                    ? "Stay tuned! We'll notify you when someone comes nearby." 
                                    : "You're all caught up with requests."}
                             </Text>
                             
                             {/* Actionable suggestions for nearby tab */}
                             {activeTab === 'nearby' && (
                                 <View style={styles.tipsContainer}>
                                     <View style={styles.tipsContent}>
                                         <Text style={styles.suggestionsTitle}>💡 Tips to find more people</Text>
                                         <View style={styles.suggestionItem}>
                                             <Ionicons name="walk-outline" size={16} color="#C5A059" />
                                             <Text style={styles.suggestionText}>Try moving to a different area</Text>
                                         </View>
                                         <View style={styles.suggestionItem}>
                                             <Ionicons name="time-outline" size={16} color="#C5A059" />
                                             <Text style={styles.suggestionText}>Check back later - people are always joining</Text>
                                         </View>
                                         <View style={styles.suggestionItem}>
                                             <Ionicons name="location-outline" size={16} color="#C5A059" />
                                             <Text style={styles.suggestionText}>Make sure your location is enabled</Text>
                                         </View>
                                     </View>
                                     
                                     <TouchableOpacity
                                         style={styles.refreshButton}
                                         onPress={refreshNearbyUsers}
                                         disabled={nearbyUsersLoading}
                                     >
                                         <Ionicons 
                                             name="refresh" 
                                             size={18} 
                                             color="#D4AF37" 
                                             style={{ marginRight: 6 }}
                                         />
                                         <Text style={styles.refreshButtonText}>
                                             {nearbyUsersLoading ? 'Refreshing...' : 'Refresh Now'}
                                         </Text>
                                     </TouchableOpacity>
                                 </View>
                             )}
                             
                             {/* Suggestions for requests tab */}
                             {activeTab === 'requests' && (
                                 <View style={styles.tipsContainer}>
                                     <View style={styles.tipsContent}>
                                         <Text style={styles.suggestionsTitle}>💡 Keep the momentum going</Text>
                                         <View style={styles.suggestionItem}>
                                             <Ionicons name="heart-outline" size={16} color="#C5A059" />
                                             <Text style={styles.suggestionText}>Send Quick Hellos to nearby users</Text>
                                         </View>
                                         <View style={styles.suggestionItem}>
                                             <Ionicons name="people-outline" size={16} color="#C5A059" />
                                             <Text style={styles.suggestionText}>Check the "Nearby" tab to discover new people</Text>
                                         </View>
                                     </View>
                                     
                                     <TouchableOpacity
                                         style={styles.refreshButton}
                                         onPress={() => {
                                             connectNowAnalytics.trackTabFilterChange('nearby', { count: nearbyCount });
                                             setActiveTab('nearby');
                                         }}
                                     >
                                         <Ionicons 
                                             name="people" 
                                             size={18} 
                                             color="#D4AF37" 
                                             style={{ marginRight: 6 }}
                                         />
                                         <Text style={styles.refreshButtonText}>
                                             Go to Nearby
                                         </Text>
                                     </TouchableOpacity>
                                 </View>
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
              <View style={[styles.offlineIconCircle, { backgroundColor: '#f5f5f5' }]}>
                 <Ionicons name="navigate-circle" size={80} color="#D4AF37" />
              </View>
              <Text style={styles.offlineTitle}>Enable Connect Now</Text>
              <Text style={styles.offlineDesc}>
                  Discover matches around you in real-time. Turn on visibility to see who's nearby and let them find you.
              </Text>
              
              <TouchableOpacity 
                style={styles.enableButton}
                onPress={() => handleToggleConnectNow(true)}
              >
                  <Text style={styles.enableButtonText}>Start Discovering</Text>
                  <Ionicons name="arrow-forward" size={20} color="#fff" />
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: '#fff',
  },
  screenTitle: {
    fontSize: 24,
    fontWeight: '800', // Extra Bold
    color: '#000',
    letterSpacing: -0.5,
  },
  screenSubtitle: {
    fontSize: 14,
    color: '#888',
    marginTop: 2,
    fontWeight: '500',
  },
  headerRight: {
      flexDirection: 'row',
      alignItems: 'center',
  },
  toggleWrapper: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: '#f9f9f9',
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: '#eee',
  },
  toggleLabel: {
      fontSize: 12,
      fontWeight: '600',
      marginRight: 6,
      marginLeft: 4,
  },
  viewToggleContainer: {
     paddingTop: 15,
     paddingBottom: 10,
     paddingHorizontal: 20,
     backgroundColor: '#fff',
     zIndex: 10,
  },
  segmentedControl: {
      flexDirection: 'row',
      backgroundColor: '#f0f0f0',
      borderRadius: 12,
      padding: 4,
  },
  segmentOption: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 8,
      borderRadius: 10,
      gap: 6,
  },
  segmentActive: {
      backgroundColor: '#D4AF37',
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.15,
      shadowRadius: 4,
      elevation: 3,
  },
  segmentText: {
      fontSize: 14,
      fontWeight: '600',
      color: '#666',
  },
  segmentTextActive: {
      color: '#fff',
  },
  tabFilterContainer: {
      flexDirection: 'row',
      marginTop: 15,
      borderBottomWidth: 1,
      borderBottomColor: '#eee',
  },
  filterTab: {
      marginRight: 25,
      paddingBottom: 10,
  },
  filterTabActive: {
      borderBottomWidth: 2,
      borderBottomColor: '#D4AF37',
  },
  filterText: {
      fontSize: 15,
      fontWeight: '600',
      color: '#999',
  },
  filterTextActive: {
      color: '#D4AF37',
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
      backgroundColor: '#fff',
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
      color: '#000',
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
      borderTopColor: '#fff', 
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
      backgroundColor: 'rgba(255,255,255,0.9)',
  },
  mapOverlayText: {
      fontSize: 13,
      fontWeight: '600',
      color: '#000',
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
      color: '#333',
      marginTop: 12,
      textAlign: 'center',
  },
  loadingSubtext: {
      fontSize: 14,
      color: '#666',
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
      backgroundColor: 'rgba(255, 255, 255, 0.9)',
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 1000,
  },
  mapLoadingContent: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: '#fff',
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
      color: '#666',
      marginLeft: 8,
      fontWeight: '500',
  },
  listContainer: {
      flex: 1,
      backgroundColor: '#f8f8f8',
  },
  listContent: {
      paddingBottom: 20,
      paddingTop: 10,
  },
  loadingContainer: {
      paddingTop: 50,
      alignItems: 'center',
  },
  loadingText: {
      marginTop: 12,
      color: '#888',
      fontSize: 14,
  },
  emptyContainer: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 40,
      paddingBottom: 100,
  },
  emptyTitle: {
      fontSize: 18,
      fontWeight: '700',
      color: '#333',
      marginTop: 20,
      marginBottom: 8,
  },
  emptySub: {
      fontSize: 14,
      color: '#888',
      textAlign: 'center',
      lineHeight: 20,
      marginBottom: 24,
  },
  emptySuggestions: {
      marginTop: 8,
      paddingHorizontal: 20,
      width: '100%',
      alignItems: 'center',
  },
  tipsContainer: {
      width: '95%',
      alignSelf: 'center',
      marginTop: 20,
  },
  tipsContent: {
      backgroundColor: '#F9F9F9',
      borderRadius: 12,
      padding: 20,
      alignItems: 'flex-start',
  },
  suggestionsTitle: {
      fontSize: 16,
      fontWeight: '700',
      color: '#333',
      marginBottom: 16,
      textAlign: 'left',
  },
  suggestionItem: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 10,
      marginBottom: 12,
      width: '100%',
  },
  suggestionText: {
      fontSize: 14,
      color: '#666',
      textAlign: 'left',
      flex: 1,
      flexWrap: 'wrap',
  },
  refreshButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 20,
      paddingVertical: 12,
      paddingHorizontal: 24,
      borderRadius: 25,
      backgroundColor: '#FFF9E6',
      borderWidth: 1,
      borderColor: '#D4AF37',
  },
  refreshButtonText: {
      fontSize: 15,
      fontWeight: '600',
      color: '#D4AF37',
  },
  offlineContainer: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      padding: 30,
      backgroundColor: '#fff',
  },
  offlineIconCircle: {
      width: 140,
      height: 140,
      borderRadius: 70,
      backgroundColor: '#f5f5f5',
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 30,
  },
  offlineTitle: {
      fontSize: 24,
      fontWeight: '800',
      color: '#000',
      marginBottom: 10,
  },
  offlineDesc: {
      fontSize: 15,
      color: '#666',
      textAlign: 'center',
      lineHeight: 22,
      marginBottom: 40,
  },
  enableButton: {
      flexDirection: 'row',
      backgroundColor: '#D4AF37',
      paddingHorizontal: 32,
      paddingVertical: 16,
      borderRadius: 30,
      alignItems: 'center',
      gap: 10,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 10,
      elevation: 6,
  },
  enableButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
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

