import { useState, useEffect, useRef } from 'react';
import * as Location from 'expo-location';
import { Alert, AppState, Platform, Linking } from 'react-native';
import { updateLocation } from '../services/api/connectNow';
import socketService from '../services/socket';
import { LOCATION_UPDATE_INTERVAL, BACKGROUND_UPDATE_INTERVAL, USE_TEST_LOCATION, TEST_COORDINATES } from '../constants/location';

/**
 * Custom hook for tracking user location and updating it to the server
 * Handles permissions, background updates, and cleanup
 */
export const useLocationTracking = (enabled = false) => {
  const [location, setLocation] = useState(null);
  const [permissionStatus, setPermissionStatus] = useState(null);
  const [error, setError] = useState(null);
  const locationSubscriptionRef = useRef(null);
  const updateIntervalRef = useRef(null);
  const appStateRef = useRef(AppState.currentState);
  const isMountedRef = useRef(true);

  // Request location permissions
  const requestPermissions = async (showAlertOnDenied = true) => {
    try {
      // Check current permission status first
      const { status: currentStatus, canAskAgain } = await Location.getForegroundPermissionsAsync();
      
      if (currentStatus === 'granted') {
        setPermissionStatus(currentStatus);
        // Request background permission for iOS if needed
        if (Platform.OS === 'ios') {
          const { status: bgStatus } = await Location.getBackgroundPermissionsAsync();
          if (bgStatus !== 'granted') {
            const backgroundStatus = await Location.requestBackgroundPermissionsAsync();
            if (backgroundStatus.status !== 'granted') {
              console.warn('Background location permission not granted');
            }
          }
        }
        return true;
      }

      // Request foreground permission
      const { status } = await Location.requestForegroundPermissionsAsync();
      setPermissionStatus(status);

      if (status !== 'granted') {
        setError('Location permission denied');
        
        if (showAlertOnDenied) {
          // Show alert with retry option
          Alert.alert(
            'Location Permission Required',
            'We need your location to show you nearby users. Please allow location access.',
            [
              { text: 'Cancel', style: 'cancel' },
              ...(canAskAgain !== false ? [{
                text: 'Try Again',
                onPress: () => requestPermissions(true),
              }] : []),
              {
                text: 'Open Settings',
                onPress: async () => {
                  if (Platform.OS === 'ios') {
                    await Linking.openURL('app-settings:');
                  } else {
                    await Linking.openSettings();
                  }
                },
              },
            ]
          );
        }
        
        return false;
      }

      // Request background permission for iOS
      if (Platform.OS === 'ios') {
        const backgroundStatus = await Location.requestBackgroundPermissionsAsync();
        if (backgroundStatus.status !== 'granted') {
          console.warn('Background location permission not granted');
        }
      }

      return true;
    } catch (err) {
      setError(err.message);
      if (showAlertOnDenied) {
        Alert.alert(
          'Error',
          `Failed to request location permission: ${err.message}`,
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Try Again',
              onPress: () => requestPermissions(true),
            },
          ]
        );
      }
      return false;
    }
  };

  // Get current location
  const getCurrentLocation = async () => {
    try {
      // Use test coordinates if in test mode
      if (USE_TEST_LOCATION) {
        const testLocation = {
          coords: {
            latitude: TEST_COORDINATES.latitude,
            longitude: TEST_COORDINATES.longitude,
          },
        };
        
        if (isMountedRef.current) {
          setLocation({
            latitude: TEST_COORDINATES.latitude,
            longitude: TEST_COORDINATES.longitude,
            timestamp: new Date(),
          });
        }
        
        return testLocation;
      }

      const hasPermission = permissionStatus === 'granted' || await requestPermissions();
      if (!hasPermission) {
        return null;
      }

      const currentLocation = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      if (isMountedRef.current) {
        setLocation({
          latitude: currentLocation.coords.latitude,
          longitude: currentLocation.coords.longitude,
          timestamp: new Date(),
        });
      }

      return currentLocation;
    } catch (err) {
      console.error('Error getting location:', err);
      setError(err.message);
      return null;
    }
  };

  // Update location to server
  const updateLocationToServer = async (lat, lon) => {
    try {
      // Update via API
      await updateLocation(lat, lon);
      
      // Also emit via socket for real-time updates
      socketService.updateLocation(lat, lon);
    } catch (err) {
      console.error('Error updating location to server:', err);
    }
  };

  // Start location tracking
  const startTracking = async () => {
    if (!enabled) return;

    // If using test location, skip permission request
    if (!USE_TEST_LOCATION) {
      const hasPermission = await requestPermissions(true); // Show alert on denied
      if (!hasPermission) {
        // Alert is already shown in requestPermissions
        return;
      }
    }

    // Get initial location
    const initialLocation = await getCurrentLocation();
    if (initialLocation) {
      await updateLocationToServer(
        initialLocation.coords.latitude,
        initialLocation.coords.longitude
      );
    }

    // Set up interval for location updates
    const updateLocationPeriodically = async () => {
      const currentLocation = await getCurrentLocation();
      if (currentLocation) {
        await updateLocationToServer(
          currentLocation.coords.latitude,
          currentLocation.coords.longitude
        );
      }
    };

    // Use different intervals based on app state
    const interval = appStateRef.current === 'active' 
      ? LOCATION_UPDATE_INTERVAL 
      : BACKGROUND_UPDATE_INTERVAL;

    updateIntervalRef.current = setInterval(updateLocationPeriodically, interval);

    // Only watch position if not using test location
    if (!USE_TEST_LOCATION) {
      // Watch position changes (more battery efficient for significant changes)
      try {
        locationSubscriptionRef.current = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.Balanced,
            timeInterval: interval,
            distanceInterval: 50, // Update if moved 50 meters
          },
          (newLocation) => {
            if (isMountedRef.current) {
              setLocation({
                latitude: newLocation.coords.latitude,
                longitude: newLocation.coords.longitude,
                timestamp: new Date(),
              });
              updateLocationToServer(
                newLocation.coords.latitude,
                newLocation.coords.longitude
              );
            }
          }
        );
      } catch (watchError) {
        console.warn('Error setting up location watch:', watchError);
      }
    }
  };

  // Stop location tracking
  const stopTracking = () => {
    if (locationSubscriptionRef.current) {
      locationSubscriptionRef.current.remove();
      locationSubscriptionRef.current = null;
    }
    if (updateIntervalRef.current) {
      clearInterval(updateIntervalRef.current);
      updateIntervalRef.current = null;
    }
  };

  // Handle app state changes
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (
        appStateRef.current.match(/inactive|background/) &&
        nextAppState === 'active'
      ) {
        // App has come to the foreground
        if (enabled) {
          stopTracking();
          startTracking();
        }
      }
      appStateRef.current = nextAppState;
    });

    return () => {
      subscription?.remove();
    };
  }, [enabled]);

  // Start/stop tracking based on enabled state
  useEffect(() => {
    if (enabled) {
      startTracking();
    } else {
      stopTracking();
    }

    return () => {
      stopTracking();
    };
  }, [enabled]);

  // Cleanup on unmount
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      stopTracking();
    };
  }, []);

  return {
    location,
    permissionStatus,
    error,
    requestPermissions,
    getCurrentLocation,
    startTracking,
    stopTracking,
  };
};

