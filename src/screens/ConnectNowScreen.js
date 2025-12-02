import React, { useState, useEffect } from 'react';
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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { useLocationTracking } from '../hooks/useLocationTracking';
import { useProximityMatching } from '../hooks/useProximityMatching';
import { toggleConnectNow, updateLocationPrivacy, sendQuickHello } from '../services/api/connectNow';
import socketService from '../services/socket';
import NearbyUserCard from '../components/NearbyUserCard';
import PrivacyConsentModal from '../components/PrivacyConsentModal';
import QuickHelloModal from '../components/QuickHelloModal';
import theme from '../theme/theme';
import GlassCard from '../components/GlassCard';

const ConnectNowScreen = ({ navigation }) => {
  const { userData } = useAuth();
  const [connectNowEnabled, setConnectNowEnabled] = useState(false);
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);
  const [showQuickHelloModal, setShowQuickHelloModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [privacySettings, setPrivacySettings] = useState({
    showExactDistance: true,
    shareLocation: true,
  });
  const [loading, setLoading] = useState(false);

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
      if (!userData?.locationPrivacy) {
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
        // For pending or new matches, show success alert with option to view chat
        Alert.alert(
          'Hello Sent!',
          `Your message has been sent to ${user.displayName || user.name}.`,
          [
            {
              text: 'View Chat',
              onPress: () => {
                navigation.navigate('Chat', {
                  user: user,
                  matchStatus: matchStatus,
                  isInitiator: true,
                });
              },
            },
            { text: 'OK' },
          ]
        );
      }
    } catch (error) {
      console.error('Error sending quick hello:', error);
      Alert.alert('Error', 'Failed to send message. Please try again.');
    }
  };

  // Handle view profile
  const handleViewProfile = (user) => {
    navigation.navigate('ViewUserProfile', {
      userId: user._id,
      user: user,
    });
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
    
  {/* Main Heading */}
  <View style={styles.mainHeader}>
          <Text style={styles.mainTitle}>Connect Now</Text>
          <Text style={styles.mainSubtitle}>
          Local people ready to connect in your area
          </Text>
        </View>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={nearbyUsersLoading}
            onRefresh={refreshNearbyUsers}
          />
        }
      >
      

        {/* Connect Now Toggle Card */}
        <GlassCard style={styles.toggleCard}>
          <View style={styles.toggleContainer}>
            <View style={styles.toggleInfo}>
              <Ionicons
                name="location"
                size={24}
                color={connectNowEnabled ? theme.colors.primary : '#999'}
              />
              <View style={styles.toggleTextContainer}>
                <Text style={styles.toggleTitle}>Connect Now</Text>
                <Text style={styles.toggleDescription}>
                  {connectNowEnabled
                    ? 'Find people nearby'
                    : 'Enable to find people nearby who want to connect'}
                </Text>
              </View>
            </View>
            <Switch
              value={connectNowEnabled}
              onValueChange={handleToggleConnectNow}
              disabled={loading}
              trackColor={{ false: '#ccc', true: theme.colors.primary }}
              thumbColor="#fff"
            />
          </View>

          {connectNowEnabled && (
            <View style={styles.statusContainer}>
              {location ? (
                <View style={styles.statusRow}>
                  <Ionicons name="checkmark-circle" size={16} color="#4CAF50" />
                  <Text style={styles.statusText}>Location services active</Text>
                </View>
              ) : (
                <View style={styles.statusRow}>
                  <Ionicons name="warning" size={16} color="#FF9800" />
                  <Text style={styles.statusText}>Getting location...</Text>
                </View>
              )}
            </View>
          )}

          {locationError && (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{locationError}</Text>
            </View>
          )}
        </GlassCard>

        {/* Nearby Users Section */}
        {connectNowEnabled && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Your Nearby Matches</Text>
              {nearbyUsers.length > 0 && (
                <Text style={styles.sectionCount}>{nearbyUsers.length} nearby</Text>
              )}
            </View>

            {nearbyUsersLoading && nearbyUsers.length === 0 ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={theme.colors.primary} />
                <Text style={styles.loadingText}>Finding people nearby...</Text>
              </View>
            ) : nearbyUsers.length === 0 ? (
              <GlassCard style={styles.emptyCard}>
                <Ionicons name="location-outline" size={48} color="#ccc" />
                <Text style={styles.emptyTitle}>No one nearby</Text>
                <Text style={styles.emptyDescription}>
                  We'll notify you when compatible people are within 1km
                </Text>
              </GlassCard>
            ) : (
              <FlatList
                data={nearbyUsers}
                keyExtractor={(item) => item._id}
                renderItem={({ item }) => (
                  <NearbyUserCard
                    user={item}
                    onSayHello={() => handleSayHello(item)}
                    onViewProfile={() => handleViewProfile(item)}
                  />
                )}
                scrollEnabled={false}
                ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
              />
            )}

            {nearbyUsersError && (
              <View style={styles.errorContainer}>
                <Text style={styles.errorText}>{nearbyUsersError}</Text>
              </View>
            )}
          </View>
        )}

        {/* Info Section */}
        {!connectNowEnabled && (
          <GlassCard style={styles.infoCard}>
            <Ionicons name="information-circle" size={32} color={theme.colors.primary} />
            <Text style={styles.infoTitle}>How It Works</Text>
            <Text style={styles.infoText}>
              When enabled, Connect Now helps you discover compatible people within 1km of your
              location. Both you and the other person need to have Connect Now enabled to see
              each other.
            </Text>
            <Text style={styles.infoText}>
              Your location is only shared when Connect Now is active, and you can disable it
              anytime.
            </Text>
          </GlassCard>
        )}
      </ScrollView>

      {/* Privacy Consent Modal */}
      <PrivacyConsentModal
        visible={showPrivacyModal}
        onClose={() => setShowPrivacyModal(false)}
        onAccept={handlePrivacyAccept}
        privacySettings={privacySettings}
        onPrivacySettingsChange={handlePrivacySettingsChange}
      />

      {/* Quick Hello Modal */}
      <QuickHelloModal
        visible={showQuickHelloModal}
        onClose={() => {
          setShowQuickHelloModal(false);
          setSelectedUser(null);
        }}
        onSend={handleSendQuickHello}
        user={selectedUser}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
   
    borderBottomColor: '#F2F2F7',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#000',
  },
  settingsButton: {
    padding: 4,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 24,
  },
  mainHeader: {
    paddingHorizontal: 24,
    marginBottom: 24,
  },
  mainTitle: {
    fontSize: 32,
    fontWeight: '800',
    color: '#000000',
    marginBottom: 8,
  },
  mainSubtitle: {
    fontSize: 16,
    color: '#666666',
    lineHeight: 22,
  },
  toggleCard: {
    marginBottom: 24,
    paddingHorizontal: 24,
    paddingVertical: 20,
    marginHorizontal: 16,
  },
  toggleContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  toggleInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 20,
  },
  toggleTextContainer: {
    marginLeft: 12,
    flex: 1,
  },
  toggleTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000',
    marginBottom: 4,
  },
  toggleDescription: {
    fontSize: 13,
    color: '#666',
    lineHeight: 18,
  },
  statusContainer: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusText: {
    fontSize: 14,
    color: '#666',
  },
  errorContainer: {
    marginTop: 12,
    padding: 12,
    backgroundColor: '#FFEBEE',
    borderRadius: 8,
  },
  errorText: {
    fontSize: 13,
    color: '#C62828',
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#000',
  },
  sectionCount: {
    fontSize: 14,
    color: '#666',
  },
  loadingContainer: {
    alignItems: 'center',
    padding: 40,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#666',
  },
  emptyCard: {
    padding: 40,
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyDescription: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
  },
  infoCard: {
    padding: 24,
    alignItems: 'center',
    marginHorizontal: 16,
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000',
    marginTop: 16,
    marginBottom: 12,
  },
  infoText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    textAlign: 'center',
    marginBottom: 12,
  },
});

export default ConnectNowScreen;

