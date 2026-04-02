import api from './config';
import * as connectNowAnalytics from '../connectNowAnalytics';
import { validateCoordinatesOrThrow } from '../../utils/locationValidation';
import { sanitizeMessage } from '../../utils/inputSanitization';

/**
 * Retry configuration
 */
const RETRY_CONFIG = {
  maxRetries: 3,
  initialDelay: 1000, // 1 second
  maxDelay: 8000, // 8 seconds
  retryableStatusCodes: [408, 429, 500, 502, 503, 504], // Timeout, rate limit, server errors
};

/**
 * Check if an error is retryable
 * @param {Error} error - The error object
 * @returns {boolean} - Whether the error is retryable
 */
const isRetryableError = (error) => {
  // Network errors (no response received)
  if (!error.response) {
    const networkErrors = [
      'ECONNREFUSED',
      'ECONNABORTED',
      'ETIMEDOUT',
      'Network Error',
      'timeout',
    ];
    return networkErrors.some(err => 
      error.code === err || 
      error.message?.includes(err)
    );
  }

  // Retry on specific HTTP status codes
  const status = error.response?.status;
  return RETRY_CONFIG.retryableStatusCodes.includes(status);
};

/**
 * Calculate delay for exponential backoff
 * @param {number} attempt - Current attempt number (0-indexed)
 * @returns {number} - Delay in milliseconds
 */
const calculateDelay = (attempt) => {
  const delay = RETRY_CONFIG.initialDelay * Math.pow(2, attempt);
  return Math.min(delay, RETRY_CONFIG.maxDelay);
};

/**
 * Execute API call with retry logic and exponential backoff
 * @param {Function} apiCall - The API call function to execute
 * @param {number} retryCount - Current retry attempt (default: 0)
 * @returns {Promise} - The API response
 */
const executeWithRetry = async (apiCall, retryCount = 0) => {
  try {
    return await apiCall();
  } catch (error) {
    // Don't retry if error is not retryable
    if (!isRetryableError(error)) {
      throw error;
    }

    // Don't retry if max retries reached
    if (retryCount >= RETRY_CONFIG.maxRetries) {
      throw error;
    }

    // Calculate delay and wait before retrying
    const delay = calculateDelay(retryCount);
    console.log(`Retrying API call (attempt ${retryCount + 1}/${RETRY_CONFIG.maxRetries}) after ${delay}ms...`);
    
    await new Promise(resolve => setTimeout(resolve, delay));
    
    // Recursive retry
    return executeWithRetry(apiCall, retryCount + 1);
  }
};

/**
 * Update user's current location
 * @param {number} latitude - Latitude coordinate (-90 to 90)
 * @param {number} longitude - Longitude coordinate (-180 to 180)
 * @throws {Error} - If coordinates are invalid
 */
export const updateLocation = async (latitude, longitude) => {
  // Validate coordinates before making API call
  validateCoordinatesOrThrow(latitude, longitude);

  const startTime = Date.now();
  try {
    const response = await executeWithRetry(async () => {
      return await api.post('/location/update', {
        latitude,
        longitude
      });
    });
    const duration = Date.now() - startTime;
    connectNowAnalytics.trackAPICall('location/update', 'POST', duration, true);
    return response.data;
  } catch (error) {
    const duration = Date.now() - startTime;
    connectNowAnalytics.trackAPICall('location/update', 'POST', duration, false, error);
    throw error;
  }
};

/**
 * Get list of nearby users within specified radius
 * @param {number} radius - Radius in meters (default: 1000)
 */
export const getNearbyUsers = async (radius = 1000) => {
  const startTime = Date.now();
  try {
    const response = await executeWithRetry(async () => {
      return await api.get('/location/nearby', {
        params: { radius }
      });
    });
    const duration = Date.now() - startTime;
    connectNowAnalytics.trackAPICall('location/nearby', 'GET', duration, true, null, { radius });
    return response.data;
  } catch (error) {
    const duration = Date.now() - startTime;
    connectNowAnalytics.trackAPICall('location/nearby', 'GET', duration, false, error, { radius });
    throw error;
  }
};

/**
 * Toggle Connect Now feature on/off
 * @param {boolean} enabled - Whether to enable Connect Now
 */
export const toggleConnectNow = async (enabled) => {
  const startTime = Date.now();
  try {
    const response = await executeWithRetry(async () => {
      return await api.put('/location/connect-now', {
        enabled
      });
    });
    const duration = Date.now() - startTime;
    connectNowAnalytics.trackAPICall('location/connect-now', 'PUT', duration, true, null, { enabled });
    return response.data;
  } catch (error) {
    const duration = Date.now() - startTime;
    connectNowAnalytics.trackAPICall('location/connect-now', 'PUT', duration, false, error, { enabled });
    throw error;
  }
};

/**
 * Update location privacy settings
 * @param {boolean} showExactDistance - Whether to show exact distance
 * @param {boolean} shareLocation - Whether to share location
 */
export const updateLocationPrivacy = async (showExactDistance, shareLocation) => {
  return executeWithRetry(async () => {
    const response = await api.put('/location/privacy', {
      showExactDistance,
      shareLocation
    });
    return response.data;
  });
};

/**
 * Send a quick hello message to a nearby user
 * @param {string} userId - Target user ID
 * @param {string} message - Hello message (will be sanitized)
 */
export const sendQuickHello = async (userId, message) => {
  // Sanitize message before sending to server
  const sanitizedMessage = sanitizeMessage(message || '');
  
  if (!sanitizedMessage || sanitizedMessage.trim().length === 0) {
    throw new Error('Message cannot be empty after sanitization');
  }

  const startTime = Date.now();
  try {
    const response = await executeWithRetry(async () => {
      return await api.post('/location/quick-hello', {
        userId,
        message: sanitizedMessage
      });
    });
    const duration = Date.now() - startTime;
    connectNowAnalytics.trackAPICall('location/quick-hello', 'POST', duration, true, null, {
      messageLength: sanitizedMessage.length,
    });
    return response.data;
  } catch (error) {
    const duration = Date.now() - startTime;
    connectNowAnalytics.trackAPICall('location/quick-hello', 'POST', duration, false, error, {
      messageLength: sanitizedMessage.length,
    });
    throw error;
  }
};

