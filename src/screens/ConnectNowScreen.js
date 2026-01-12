import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  FlatList,
  TouchableOpacity,
  Switch,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Dimensions,
  Image,
  Animated,
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
  const [activeTab, setActiveTab] = useState('nearby'); // 'nearby' or 'requests'
  const [viewMode, setViewMode] = useState('list'); // 'list' or 'map'
  const [showGuideSheet, setShowGuideSheet] = useState(false);

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

  // Filter users based on active tab
  const nearbyUsersFiltered = nearbyUsers.filter(user => {
    const hasPendingRequest = user.matchStatus === 'pending';
    
    if (activeTab === 'nearby') {
      // Show users without pending requests
      return !hasPendingRequest;
    } else {
      // Show users with pending requests (incoming or outgoing)
      return hasPendingRequest;
    }
  });



  // Count users for badges
  const nearbyCount = nearbyUsers.filter(u => u.matchStatus !== 'pending').length;
  const requestsCount = nearbyUsers.filter(u => u.matchStatus === 'pending').length;

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

  // Connect to socket when component mounts
  useEffect(() => {
    socketService.connect();

    // Set up socket listeners
    socketService.onConnectNowToggled((data) => {
      setConnectNowEnabled(data.enabled);
    });

    socketService.onLocationError((error) => {
      Alert.alert('Location Error', error.message || 'Failed to update location');
    });

    return () => {
      socketService.removeListener('connect_now_toggled');
      socketService.removeListener('location_error');
    };
  }, []);

  // Handle Connect Now toggle
  const handleToggleConnectNow = async (enabled) => {
    if (enabled && !connectNowEnabled) {
      // Check if we need to show privacy consent
      if (!userData?.locationPrivacy && !hasAcceptedPrivacy) {
        setShowPrivacyModal(true);
        return;
      }

      // Request location permission
      const hasPermission = await requestPermissions();
      if (!hasPermission) {
        Alert.alert(
          'Location Permission Required',
          'Please enable location permissions in settings to use Connect Now.',
          [{ text: 'OK' }]
        );
        return;
      }
    }

    try {
      setLoading(true);
      await toggleConnectNow(enabled);
      setConnectNowEnabled(enabled);
      socketService.toggleConnectNow(enabled);
    } catch (error) {
      console.error('Error toggling Connect Now:', error);
      Alert.alert('Error', 'Failed to update Connect Now settings');
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
      
      // Now enable Connect Now
      const hasPermission = await requestPermissions();
      if (hasPermission) {
        await handleToggleConnectNow(true);
      }
    } catch (error) {
      console.error('Error updating privacy settings:', error);
      Alert.alert('Error', 'Failed to save privacy settings');
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

  // Handle send quick hello
  const handleSendQuickHello = async (user, message) => {
    try {
      const response = await sendQuickHello(user._id, message);
      const matchStatus = response.matchStatus || user.matchStatus || 'pending';
      const isActiveMatch = matchStatus === 'active';
      
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
    } catch (error) {
      console.error('Error sending quick hello:', error);
      Alert.alert('Error', 'Failed to send message. Please try again.');
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
    navigation.navigate('LikeProfile', {
      user: user,
      matchId: user.matchId || null,
      fromConnectNow: true, // Flag to hide Like/Pass buttons
    });
  };

  // Handle accept match
  const handleAcceptMatch = async (user) => {
    try {
      setLoading(true);
      await respondToMatch(user.matchId, 'accept');
      
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
      Alert.alert('Error', 'Failed to accept invitation');
    } finally {
      setLoading(false);
    }
  };

  // Handle decline match
  const handleDeclineMatch = async (user) => {
    try {
      setLoading(true);
      await respondToMatch(user.matchId, 'decline');
      
      // Refresh list to remove user
      refreshNearbyUsers();
    } catch (error) {
      console.error('Error declining match:', error);
      Alert.alert('Error', 'Failed to decline invitation');
    } finally {
      setLoading(false);
    }
  };

  const mapRef = useRef(null);

  // Focus map on current location initially
  useEffect(() => {
    if (viewMode === 'map' && location && mapRef.current) {
        mapRef.current.animateToRegion({
            latitude: location.latitude,
            longitude: location.longitude,
            latitudeDelta: 0.05,
            longitudeDelta: 0.05,
        }, 1000);
    }
  }, [viewMode, location]);


  const renderHeader = () => (
    <View style={styles.headerContainer}>
      <View>
        <Text style={styles.screenTitle}>Connect Now</Text>
        <Text style={styles.screenSubtitle}>Nearby Connections</Text>
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
                onValueChange={handleToggleConnectNow}
                disabled={loading}
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
                onPress={() => setViewMode('list')}
            >
                <Ionicons name="list" size={18} color={viewMode === 'list' ? '#fff' : '#666'} />
                <Text style={[styles.segmentText, viewMode === 'list' && styles.segmentTextActive]}>List</Text>
            </TouchableOpacity>
            <TouchableOpacity 
                style={[styles.segmentOption, viewMode === 'map' && styles.segmentActive]}
                onPress={() => setViewMode('map')}
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
                    onPress={() => setActiveTab('nearby')}
                 >
                    <Text style={[styles.filterText, activeTab === 'nearby' && styles.filterTextActive]}>Nearby ({nearbyCount})</Text>
                 </TouchableOpacity>
                 <TouchableOpacity 
                    style={[styles.filterTab, activeTab === 'requests' && styles.filterTabActive]}
                    onPress={() => setActiveTab('requests')}
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
                            initialRegion={{
                                latitude: location.latitude,
                                longitude: location.longitude,
                                latitudeDelta: 0.05,
                                longitudeDelta: 0.05,
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

                            {nearbyUsersFiltered.map(user => {
                                const locationData = user.lastLocation || user.location;
                                if (locationData && locationData.coordinates) {
                                  return (
                                    <Marker
                                        key={user._id}
                                        coordinate={{
                                            latitude: locationData.coordinates[1],
                                            longitude: locationData.coordinates[0],
                                        }}
                                        title={user.displayName || user.name}
                                        description={user.distanceDisplay ? `${user.distanceDisplay} away` : ''}
                                        onCalloutPress={() => handleViewProfile(user)}
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
                                return null;
                            })}
                        </MapView>
                    ) : (
                        <View style={styles.centered}>
                             <ActivityIndicator size="large" color="#D4AF37" />
                             <Text style={{marginTop: 10, color: '#666'}}>Locating you...</Text>
                        </View>
                    )}
                    
                    {/* Floating Overlay for count */}
                    <View style={styles.mapOverlay}>
                        <GlassCard style={styles.mapOverlayCard}>
                           <Text style={styles.mapOverlayText}>{nearbyUsersFiltered.length} people found</Text>
                        </GlassCard>
                    </View>
                 </View>
            ) : (
                /* List View */
                <View style={styles.listContainer}>
                    {nearbyUsersLoading && nearbyUsers.length === 0 ? (
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
        onClose={() => setShowPrivacyModal(false)}
        onAccept={handlePrivacyAccept}
        privacySettings={privacySettings}
        onPrivacySettingsChange={handlePrivacySettingsChange}
      />

      <QuickHelloModal
        visible={showQuickHelloModal}
        onClose={() => {
          setShowQuickHelloModal(false);
          setSelectedUser(null);
        }}
        onSend={handleSendQuickHello}
        user={selectedUser}
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
});

export default ConnectNowScreen;

