import { useState, useEffect, useRef } from 'react';
import * as Location from 'expo-location';
import { Alert, AppState, Platform, Linking } from 'react-native';
import { updateLocation } from '../services/api/connectNow';
import socketService from '../services/socket';
import { LOCATION_UPDATE_INTERVAL, BACKGROUND_UPDATE_INTERVAL, USE_TEST_LOCATION, TEST_COORDINATES } from '../constants/location';
import * as connectNowAnalytics from '../services/connectNowAnalytics';
import { CONNECT_NOW_ERRORS } from '../constants/errorMessages';
import { validateCoordinates } from '../utils/locationValidation';

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
  const lastLocationRef = useRef(null);
  const lastUpdateTimeRef = useRef(null);
  const currentSpeedRef = useRef(0); // Speed in m/s
  const adaptiveIntervalRef = useRef(null);

  // Request location permissions
  const requestPermissions = async (showAlertOnDenied = true) => {
    try {
      // Check current permission status first
      const { status: currentStatus, canAskAgain: initialCanAskAgain } = await Location.getForegroundPermissionsAsync();
      
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

      // If permission was previously denied and can't ask again, direct to settings
      if (currentStatus === 'denied' && initialCanAskAgain === false) {
        setError('Location permission permanently denied');
        setPermissionStatus('denied');
        
        if (showAlertOnDenied) {
          const platformMessage = Platform.OS === 'ios'
            ? 'To enable Connect Now, please allow location access:\n\n1. Tap "Open Settings" below\n2. Find "Location" in the app settings\n3. Select "While Using the App" or "Always"\n4. Return to the app to continue'
            : 'To enable Connect Now, please allow location access:\n\n1. Tap "Open Settings" below\n2. Find "Permissions" or "App Permissions"\n3. Enable "Location"\n4. Return to the app to continue';
          
          Alert.alert(
            'Location Permission Required',
            `Location access is required for Connect Now to show you nearby users and let others find you.\n\n${platformMessage}`,
            [
              { text: 'Cancel', style: 'cancel' },
              {
                text: 'Open Settings',
                onPress: async () => {
                  try {
                    if (Platform.OS === 'ios') {
                      await Linking.openURL('app-settings:');
                    } else {
                      await Linking.openSettings();
                    }
                  } catch (error) {
                    console.error('Error opening settings:', error);
                    Alert.alert(
                      'Unable to Open Settings',
                      'Please manually open your device settings and enable location permission for this app.',
                      [{ text: 'OK' }]
                    );
                  }
                },
              },
            ]
          );
        }
        return false;
      }

      // Request foreground permission
      const { status, canAskAgain } = await Location.requestForegroundPermissionsAsync();
      setPermissionStatus(status);

      // Track permission request
      connectNowAnalytics.trackLocationPermission(status, canAskAgain, {
        isPermanentlyDenied: canAskAgain === false,
      });

      if (status !== 'granted') {
        setError('Location permission denied');
        
        if (showAlertOnDenied) {
          // Determine if permission is permanently denied
          const isPermanentlyDenied = canAskAgain === false || status === 'denied';
          
          if (isPermanentlyDenied) {
            // Permanently denied - must go to settings
            const platformMessage = Platform.OS === 'ios'
              ? 'To enable Connect Now, please allow location access:\n\n1. Tap "Open Settings" below\n2. Find "Location" in the app settings\n3. Select "While Using the App" or "Always"\n4. Return to the app to continue'
              : 'To enable Connect Now, please allow location access:\n\n1. Tap "Open Settings" below\n2. Find "Permissions" or "App Permissions"\n3. Enable "Location"\n4. Return to the app to continue';
            
            Alert.alert(
              'Location Permission Required',
              `Location access is required for Connect Now to show you nearby users and let others find you.\n\n${platformMessage}`,
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Open Settings',
                  onPress: async () => {
                    try {
                      if (Platform.OS === 'ios') {
                        await Linking.openURL('app-settings:');
                      } else {
                        await Linking.openSettings();
                      }
                    } catch (error) {
                      console.error('Error opening settings:', error);
                      Alert.alert(
                        'Unable to Open Settings',
                        'Please manually open your device settings and enable location permission for this app.',
                        [{ text: 'OK' }]
                      );
                    }
                  },
                },
              ]
            );
          } else {
            // Can ask again - show retry option with helpful guidance
            Alert.alert(
              'Location Permission Required',
              'Connect Now needs your location to:\n• Show you nearby users\n• Let others find you\n• Update your location in real-time\n\nPlease allow location access when prompted.',
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Try Again',
                  onPress: () => requestPermissions(true),
                },
                {
                  text: 'Open Settings',
                  style: 'default',
                  onPress: async () => {
                    try {
                      if (Platform.OS === 'ios') {
                        await Linking.openURL('app-settings:');
                      } else {
                        await Linking.openSettings();
                      }
                    } catch (error) {
                      console.error('Error opening settings:', error);
                    }
                  },
                },
              ]
            );
          }
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
        const platformMessage = Platform.OS === 'ios'
          ? 'You can enable location access manually:\n\n1. Open Settings app\n2. Find this app in the list\n3. Tap "Location"\n4. Select "While Using the App" or "Always"'
          : 'You can enable location access manually:\n\n1. Open Settings app\n2. Go to "Apps" or "Application Manager"\n3. Find this app\n4. Tap "Permissions"\n5. Enable "Location"';
        
        Alert.alert(
          'Permission Request Error',
          `Unable to request location permission.\n\n${platformMessage}\n\nError: ${err.message}`,
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Try Again',
              onPress: () => requestPermissions(true),
            },
            {
              text: 'Open Settings',
              onPress: async () => {
                try {
                  if (Platform.OS === 'ios') {
                    await Linking.openURL('app-settings:');
                  } else {
                    await Linking.openSettings();
                  }
                } catch (error) {
                  console.error('Error opening settings:', error);
                  Alert.alert(
                    'Unable to Open Settings',
                    'Please manually open your device settings and enable location permission for this app.',
                    [{ text: 'OK' }]
                  );
                }
              },
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

      // Validate coordinates from device
      const lat = currentLocation.coords.latitude;
      const lon = currentLocation.coords.longitude;
      const validation = validateCoordinates(lat, lon);
      
      if (!validation.valid) {
        console.error('Invalid coordinates from device:', validation.error);
        if (isMountedRef.current) {
          setError(validation.error);
        }
        return null;
      }

      if (isMountedRef.current) {
        setLocation({
          latitude: lat,
          longitude: lon,
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

  // Calculate distance between two coordinates in meters (Haversine formula)
  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371000; // Earth's radius in meters
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  // Calculate speed based on location changes
  const calculateSpeed = (newLat, newLon) => {
    if (!lastLocationRef.current || !lastUpdateTimeRef.current) {
      return 0;
    }

    const distance = calculateDistance(
      lastLocationRef.current.latitude,
      lastLocationRef.current.longitude,
      newLat,
      newLon
    );

    const timeElapsed = (Date.now() - lastUpdateTimeRef.current) / 1000; // seconds
    if (timeElapsed === 0) return 0;

    const speed = distance / timeElapsed; // m/s
    return speed;
  };

  // Get adaptive update interval based on movement speed
  const getAdaptiveInterval = (speed) => {
    const baseInterval = appStateRef.current === 'active' 
      ? LOCATION_UPDATE_INTERVAL 
      : BACKGROUND_UPDATE_INTERVAL;

    // Speed thresholds (m/s)
    // 0-1 m/s: Stationary or very slow (walking slowly) - use longer intervals
    // 1-3 m/s: Walking or slow movement - use medium intervals
    // >3 m/s: Running, cycling, or driving - use shorter intervals

    if (speed < 1) {
      // Stationary or very slow - update less frequently
      return Math.max(baseInterval * 2, 300000); // At least 5 minutes, up to 2x base
    } else if (speed < 3) {
      // Walking speed - use base interval
      return baseInterval;
    } else if (speed < 10) {
      // Running or cycling - update more frequently
      return Math.min(baseInterval / 2, 60000); // At most 1 minute, half of base
    } else {
      // Driving or fast movement - update very frequently
      return 30000; // 30 seconds
    }
  };

  // Update location to server with retry logic
  const updateLocationToServer = async (lat, lon, retryCount = 0) => {
    const MAX_RETRIES = 2;
    const startTime = Date.now();
    
    // Validate coordinates before processing
    const validation = validateCoordinates(lat, lon);
    if (!validation.valid) {
      console.error('Invalid coordinates:', validation.error);
      if (isMountedRef.current) {
        setError(validation.error);
      }
      return;
    }
    
    try {
      // Calculate speed before updating (uses previous location)
      const speed = calculateSpeed(lat, lon);
      currentSpeedRef.current = speed;
      
      // Update via API (validation already done, but updateLocation will validate again)
      await updateLocation(lat, lon);
      
      // Also emit via socket for real-time updates
      socketService.updateLocation(lat, lon);
      
      const duration = Date.now() - startTime;
      
      // Track successful update
      connectNowAnalytics.trackLocationUpdate(true, duration, null, {
        speed: speed.toFixed(2),
        retryCount,
      });
      
      // Update last location and time after successful update
      lastLocationRef.current = { latitude: lat, longitude: lon };
      lastUpdateTimeRef.current = Date.now();
    } catch (err) {
      console.error('Error updating location to server:', err);
      
      // Retry on network errors (not on 4xx client errors)
      if (retryCount < MAX_RETRIES && (
        err.code === 'ECONNREFUSED' || 
        err.code === 'ECONNABORTED' ||
        err.message?.includes('Network Error')
      )) {
        // Exponential backoff: wait 1s, then 2s
        await new Promise(resolve => setTimeout(resolve, (retryCount + 1) * 1000));
        return updateLocationToServer(lat, lon, retryCount + 1);
      }
      
      // Track failed update
      const duration = Date.now() - startTime;
      connectNowAnalytics.trackLocationUpdate(false, duration, err, {
        retryCount,
        errorCode: err.code,
      });
      
      // Set error state for critical failures (after retries exhausted)
      if (retryCount >= MAX_RETRIES && isMountedRef.current) {
        setError(CONNECT_NOW_ERRORS.LOCATION_UPDATE_FAILED);
      }
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
      const lat = initialLocation.coords.latitude;
      const lon = initialLocation.coords.longitude;
      
      // Initialize tracking references
      lastLocationRef.current = { latitude: lat, longitude: lon };
      lastUpdateTimeRef.current = Date.now();
      currentSpeedRef.current = 0;
      
      await updateLocationToServer(lat, lon);
    }

    // Adaptive location update function
    const updateLocationAdaptively = async () => {
      const currentLocation = await getCurrentLocation();
      if (currentLocation && isMountedRef.current) {
        const lat = currentLocation.coords.latitude;
        const lon = currentLocation.coords.longitude;
        
        await updateLocationToServer(lat, lon);
        
        // Calculate new adaptive interval based on current speed
        const speed = currentSpeedRef.current;
        const newInterval = getAdaptiveInterval(speed);
        
        // Clear old timeout and set new one with adaptive timing
        if (updateIntervalRef.current) {
          clearTimeout(updateIntervalRef.current);
        }
        
        // Set up next update with adaptive interval
        updateIntervalRef.current = setTimeout(() => {
          if (isMountedRef.current && enabled) {
            updateLocationAdaptively();
          }
        }, newInterval);
      }
    };

    // Start with base interval, then adapt based on movement
    const baseInterval = appStateRef.current === 'active' 
      ? LOCATION_UPDATE_INTERVAL 
      : BACKGROUND_UPDATE_INTERVAL;

    // Initial update after base interval
    updateIntervalRef.current = setTimeout(() => {
      if (isMountedRef.current && enabled) {
        updateLocationAdaptively();
      }
    }, baseInterval);

    // Only watch position if not using test location
    if (!USE_TEST_LOCATION) {
      // Watch position changes with adaptive distance interval based on speed
      // Faster movement = larger distance threshold (less frequent updates when moving fast)
      // Slower movement = smaller distance threshold (more frequent updates when stationary)
      const getAdaptiveDistanceInterval = () => {
        const speed = currentSpeedRef.current;
        if (speed < 1) return 20; // Stationary - update every 20m
        if (speed < 3) return 50; // Walking - update every 50m (default)
        if (speed < 10) return 100; // Running - update every 100m
        return 200; // Driving - update every 200m
      };

      try {
        // Start with default distance interval
        let distanceInterval = 50;
        
        locationSubscriptionRef.current = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.Balanced,
            timeInterval: 10000, // Check every 10 seconds (minimum)
            distanceInterval: distanceInterval,
          },
          (newLocation) => {
            if (isMountedRef.current) {
              const lat = newLocation.coords.latitude;
              const lon = newLocation.coords.longitude;
              
              // Validate coordinates from watchPositionAsync
              const validation = validateCoordinates(lat, lon);
              if (!validation.valid) {
                console.error('Invalid coordinates from watchPositionAsync:', validation.error);
                if (isMountedRef.current) {
                  setError(validation.error);
                }
                return;
              }
              
              setLocation({
                latitude: lat,
                longitude: lon,
                timestamp: new Date(),
              });
              
              // Update location and calculate speed
              const speed = calculateSpeed(lat, lon);
              currentSpeedRef.current = speed;
              lastLocationRef.current = { latitude: lat, longitude: lon };
              lastUpdateTimeRef.current = Date.now();
              
              // Update to server
              updateLocationToServer(lat, lon);
              
              // Adapt distance interval based on speed (for future updates)
              // Note: We can't change distanceInterval on the fly, but this helps
              // optimize the next watchPositionAsync call if we restart it
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
      clearTimeout(updateIntervalRef.current);
      updateIntervalRef.current = null;
    }
    if (adaptiveIntervalRef.current) {
      clearTimeout(adaptiveIntervalRef.current);
      adaptiveIntervalRef.current = null;
    }
    // Reset tracking references
    lastLocationRef.current = null;
    lastUpdateTimeRef.current = null;
    currentSpeedRef.current = 0;
  };

  // Handle app state changes
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (
        appStateRef.current.match(/inactive|background/) &&
        nextAppState === 'active'
      ) {
        // App has come to the foreground - check if permission status changed
        // (e.g., user granted permission in settings)
        Location.getForegroundPermissionsAsync().then(({ status }) => {
          if (isMountedRef.current) {
            setPermissionStatus(status);
            // If permission was just granted and tracking is enabled, start tracking
            if (status === 'granted' && enabled) {
              stopTracking();
              startTracking();
            }
          }
        }).catch(() => {
          // Ignore permission check errors
        });
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

