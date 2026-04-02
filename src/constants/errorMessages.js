/**
 * Standardized error messages for ConnectNow feature
 * Provides consistent, user-friendly error messages across the app
 */

export const CONNECT_NOW_ERRORS = {
  // Connection/Network errors
  NETWORK_ERROR: 'Unable to connect to the server. Please check your internet connection and try again.',
  NETWORK_ERROR_SHORT: 'Connection error. Please try again.',
  
  // Connect Now toggle errors
  TOGGLE_ENABLE_FAILED: 'Unable to enable Connect Now. Please try again.',
  TOGGLE_DISABLE_FAILED: 'Unable to disable Connect Now. Please try again.',
  TOGGLE_GENERIC: 'Unable to update Connect Now settings. Please try again.',
  
  // Privacy settings errors
  PRIVACY_SAVE_FAILED: 'Unable to save privacy settings. Please try again.',
  
  // Quick Hello errors
  QUICK_HELLO_SEND_FAILED: 'Unable to send your message. Please check your connection and try again.',
  QUICK_HELLO_RATE_LIMIT: (waitTime) => 
    `You can send up to 5 quick hellos per minute. Please wait ${waitTime} second${waitTime !== 1 ? 's' : ''} before sending another.`,
  
  // Match response errors
  MATCH_ACCEPT_FAILED: 'Unable to accept the invitation. Please try again.',
  MATCH_DECLINE_FAILED: 'Unable to decline the invitation. Please try again.',
  
  // Location errors
  LOCATION_UPDATE_FAILED: 'Unable to update your location. Please check your connection and try again.',
  LOCATION_PERMISSION_DENIED: 'Location access is required for Connect Now. Please enable it in your device settings.',
  LOCATION_PERMISSION_ERROR: 'Unable to access location. Please check your device settings.',
  
  // Nearby users errors
  NEARBY_USERS_LOAD_FAILED: 'Unable to load nearby users. Please try again.',
  NEARBY_USERS_EMPTY: 'No users found nearby. Try again later or check back soon.',
  
  // Socket errors
  SOCKET_CONNECTION_FAILED: 'Unable to connect to real-time updates. Please check your connection.',
  
  // Generic errors
  GENERIC_ERROR: 'Something went wrong. Please try again.',
  GENERIC_ERROR_WITH_RETRY: 'An error occurred. Please try again.',
};

/**
 * Get user-friendly error message from error object
 * @param {Error} error - Error object
 * @param {string} fallback - Fallback message if error type can't be determined
 * @returns {string} User-friendly error message
 */
export const getErrorMessage = (error, fallback = CONNECT_NOW_ERRORS.GENERIC_ERROR) => {
  if (!error) return fallback;
  
  // Network errors
  if (!error.response) {
    const networkErrors = ['ECONNREFUSED', 'ECONNABORTED', 'ETIMEDOUT', 'Network Error'];
    if (networkErrors.some(err => error.code === err || error.message?.includes(err))) {
      return CONNECT_NOW_ERRORS.NETWORK_ERROR;
    }
  }
  
  // HTTP status code errors
  if (error.response) {
    const status = error.response.status;
    switch (status) {
      case 400:
        return error.response.data?.message || 'Invalid request. Please try again.';
      case 401:
        return 'Your session has expired. Please log in again.';
      case 403:
        return 'You don\'t have permission to perform this action.';
      case 404:
        return 'The requested resource was not found.';
      case 408:
      case 504:
        return CONNECT_NOW_ERRORS.NETWORK_ERROR;
      case 429:
        return 'Too many requests. Please wait a moment and try again.';
      case 500:
      case 502:
      case 503:
        return 'Server error. Please try again in a moment.';
      default:
        return error.response.data?.message || fallback;
    }
  }
  
  // Error message from backend
  if (error.message) {
    // If it's a user-friendly message, return it
    if (error.message.length < 100 && !error.message.includes('Error:') && !error.message.includes('at ')) {
      return error.message;
    }
  }
  
  return fallback;
};
