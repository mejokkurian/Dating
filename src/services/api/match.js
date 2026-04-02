import api from './config';

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
    if (__DEV__) {
      console.log(`Retrying match API call (attempt ${retryCount + 1}/${RETRY_CONFIG.maxRetries}) after ${delay}ms...`);
    }
    
    await new Promise(resolve => setTimeout(resolve, delay));
    
    // Recursive retry
    return executeWithRetry(apiCall, retryCount + 1);
  }
};

export const getMyMatches = async () => {
  const response = await executeWithRetry(async () => {
    return await api.get('/matches/my-matches');
  });
  return response.data;
};

export const getPotentialMatches = async () => {
  const response = await executeWithRetry(async () => {
    return await api.get('/matches');
  });
  return response.data;
};

export const getTopPicks = async () => {
  const response = await executeWithRetry(async () => {
    return await api.get('/matches/top-picks');
  });
  return response.data;
};

export const recordInteraction = async (targetId, action, comment = null) => {
  const payload = { targetId, action };
  if (comment) payload.comment = comment;
  const response = await executeWithRetry(async () => {
    return await api.post('/matches/interaction', payload);
  });
  return response.data;
};

export const respondToMatch = async (matchId, action) => {
  const response = await executeWithRetry(async () => {
    return await api.post(`/matches/${matchId}/respond`, {
      action
    });
  });
  return response.data;
};
