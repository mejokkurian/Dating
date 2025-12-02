// Location-based Connect Now constants

// Proximity radius in meters (1km)
export const PROXIMITY_RADIUS = 1000;

// Test coordinates for development/testing
// Set USE_TEST_LOCATION to true to use these coordinates instead of real GPS
export const USE_TEST_LOCATION = __DEV__; // Only in development mode
export const TEST_COORDINATES = {
  latitude: 10.903718624605833,
  longitude: 76.52076285131433,
};

// Location update intervals in milliseconds
export const LOCATION_UPDATE_INTERVAL = 120000; // 2 minutes when app is active
export const BACKGROUND_UPDATE_INTERVAL = 300000; // 5 minutes when app is in background

// Location accuracy settings
export const LOCATION_ACCURACY = {
  HIGH: { accuracy: 6 }, // High accuracy (uses GPS)
  MEDIUM: { accuracy: 10 }, // Medium accuracy (balanced)
  LOW: { accuracy: 100 } // Low accuracy (battery saving)
};

// Distance display formats
export const DISTANCE_FORMATS = {
  METERS: 'meters',
  KILOMETERS: 'kilometers',
  FEET: 'feet',
  MILES: 'miles'
};

// Convert meters to readable format
export const formatDistance = (distanceInMeters, showExact = true) => {
  if (!showExact) {
    if (distanceInMeters < 100) return 'Very close';
    if (distanceInMeters < 500) return 'Nearby';
    if (distanceInMeters < 1000) return 'Close by';
    return 'In the area';
  }

  if (distanceInMeters < 1000) {
    return `${Math.round(distanceInMeters)}m`;
  } else {
    return `${(distanceInMeters / 1000).toFixed(1)}km`;
  }
};

