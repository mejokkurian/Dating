import api from './config';

/**
 * Update user's current location
 * @param {number} latitude - Latitude coordinate
 * @param {number} longitude - Longitude coordinate
 */
export const updateLocation = async (latitude, longitude) => {
  try {
    const response = await api.post('/location/update', {
      latitude,
      longitude
    });
    return response.data;
  } catch (error) {
    console.error('Error updating location:', error);
    throw error;
  }
};

/**
 * Get list of nearby users within specified radius
 * @param {number} radius - Radius in meters (default: 1000)
 */
export const getNearbyUsers = async (radius = 1000) => {
  try {
    const response = await api.get('/location/nearby', {
      params: { radius }
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching nearby users:', error);
    throw error;
  }
};

/**
 * Toggle Connect Now feature on/off
 * @param {boolean} enabled - Whether to enable Connect Now
 */
export const toggleConnectNow = async (enabled) => {
  try {
    const response = await api.put('/location/connect-now', {
      enabled
    });
    return response.data;
  } catch (error) {
    console.error('Error toggling Connect Now:', error);
    throw error;
  }
};

/**
 * Update location privacy settings
 * @param {boolean} showExactDistance - Whether to show exact distance
 * @param {boolean} shareLocation - Whether to share location
 */
export const updateLocationPrivacy = async (showExactDistance, shareLocation) => {
  try {
    const response = await api.put('/location/privacy', {
      showExactDistance,
      shareLocation
    });
    return response.data;
  } catch (error) {
    console.error('Error updating location privacy:', error);
    throw error;
  }
};

/**
 * Send a quick hello message to a nearby user
 * @param {string} userId - Target user ID
 * @param {string} message - Hello message
 */
export const sendQuickHello = async (userId, message) => {
  try {
    const response = await api.post('/location/quick-hello', {
      userId,
      message
    });
    return response.data;
  } catch (error) {
    console.error('Error sending quick hello:', error);
    throw error;
  }
};

