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
      throw error.response ? error.response.data : error;
    }

    // Don't retry if max retries reached
    if (retryCount >= RETRY_CONFIG.maxRetries) {
      throw error.response ? error.response.data : error;
    }

    // Calculate delay and wait before retrying
    const delay = calculateDelay(retryCount);
    if (__DEV__) {
      console.log(`Retrying chat API call (attempt ${retryCount + 1}/${RETRY_CONFIG.maxRetries}) after ${delay}ms...`);
    }
    
    await new Promise(resolve => setTimeout(resolve, delay));
    
    // Recursive retry
    return executeWithRetry(apiCall, retryCount + 1);
  }
};

export const getConversations = async () => {
  return executeWithRetry(async () => {
    const response = await api.get('/chat/conversations');
    return response.data;
  });
};

export const getMessages = async (userId, before = null, limit = 50) => {
  return executeWithRetry(async () => {
    const params = { limit };
    if (before) params.before = before;
    
    const response = await api.get(`/chat/messages/${userId}`, { params });
    return response.data;
  });
};

export const markAsRead = async (conversationId) => {
  return executeWithRetry(async () => {
    const response = await api.post(`/chat/mark-read/${conversationId}`);
    return response.data;
  });
};
