import api from "./config";
import AsyncStorage from "@react-native-async-storage/async-storage";

/**
 * Retry configuration for auth API calls
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
      console.log(`Retrying auth API call (attempt ${retryCount + 1}/${RETRY_CONFIG.maxRetries}) after ${delay}ms...`);
    }
    
    await new Promise(resolve => setTimeout(resolve, delay));
    
    // Recursive retry
    return executeWithRetry(apiCall, retryCount + 1);
  }
};

export const signInWithEmail = async (email, password) => {
  return executeWithRetry(async () => {
    if (__DEV__) {
      console.log('🔍 Email login to:', api.defaults.baseURL);
    }
    
    const response = await api.post("/auth/login", { email, password });
    if (response.data.token) {
      await AsyncStorage.setItem("userToken", response.data.token);
      await AsyncStorage.setItem("userData", JSON.stringify(response.data));
    }
    
    if (__DEV__) {
      console.log('✅ Email login successful');
    }
    
    return response.data;
  }).catch(error => {
    if (__DEV__) {
      console.error('❌ Email login error details:');
      console.error('  Code:', error.code);
      console.error('  Message:', error.message);
      console.error('  Base URL:', api.defaults.baseURL);
    }
    
    // Handle timeout and network errors
    if (error.code === "ECONNABORTED" || error.message?.includes("timeout")) {
      throw {
        message:
          "Request timed out. Please check your connection and ensure the backend server is running.",
        code: "TIMEOUT",
      };
    }
    if (
      error.code === "ECONNREFUSED" ||
      error.message?.includes("Network Error")
    ) {
      throw {
        message:
          "Cannot connect to server. Please check that the backend is running and the IP address is correct.",
        code: "CONNECTION_ERROR",
      };
    }
    throw error;
  });
};

export const createAccountWithEmail = async (email, password, displayName) => {
  return executeWithRetry(async () => {
    if (__DEV__) {
      console.log('🔍 Account creation to:', api.defaults.baseURL);
    }
    
    const response = await api.post("/auth/register", {
      email,
      password,
      displayName,
    });
    if (response.data.token) {
      await AsyncStorage.setItem("userToken", response.data.token);
      await AsyncStorage.setItem("userData", JSON.stringify(response.data));
    }
    
    if (__DEV__) {
      console.log('✅ Account created successfully');
    }
    
    return response.data;
  }).catch(error => {
    if (__DEV__) {
      console.error('❌ Account creation error details:');
      console.error('  Code:', error.code);
      console.error('  Message:', error.message);
      console.error('  Base URL:', api.defaults.baseURL);
    }
    
    // Handle timeout and network errors
    if (error.code === "ECONNABORTED" || error.message?.includes("timeout")) {
      throw {
        message:
          "Request timed out. Please check your connection and ensure the backend server is running.",
        code: "TIMEOUT",
      };
    }
    if (
      error.code === "ECONNREFUSED" ||
      error.message?.includes("Network Error")
    ) {
      throw {
        message:
          "Cannot connect to server. Please check that the backend is running and the IP address is correct.",
        code: "CONNECTION_ERROR",
      };
    }
    throw error;
  });
};

export const signOut = async () => {
  try {
    await AsyncStorage.removeItem("userToken");
    await AsyncStorage.removeItem("userData");
  } catch (error) {
    if (__DEV__) {
      console.error("Error signing out:", error);
    }
  }
};

// Mocking other auth methods for now or implementing if backend supports them
export const signInWithGoogle = async (googleData) => {
  return executeWithRetry(async () => {
    // Map 'token' to 'idToken' if needed
    const payload = {
      ...googleData,
      idToken: googleData.token || googleData.idToken,
    };

    const response = await api.post("/auth/google", payload);
    if (response.data.token) {
      await AsyncStorage.setItem("userToken", response.data.token);
      await AsyncStorage.setItem("userData", JSON.stringify(response.data));
    }
    return response.data;
  });
};

export const signInWithApple = async (appleData) => {
  return executeWithRetry(async () => {
    // Map 'token' to 'identityToken' if needed, or ensure caller passes 'identityToken'
    const payload = {
      ...appleData,
      identityToken: appleData.token || appleData.identityToken,
    };
    
    const response = await api.post("/auth/apple", payload);
    if (response.data.token) {
      await AsyncStorage.setItem("userToken", response.data.token);
      await AsyncStorage.setItem("userData", JSON.stringify(response.data));
    }
    return response.data;
  });
};

export const signInWithPhoneNumber = async (phoneNumber) => {
  return executeWithRetry(async () => {
    if (__DEV__) {
      console.log('🔍 Attempting phone auth to:', api.defaults.baseURL);
      console.log('🔍 Full endpoint:', `${api.defaults.baseURL}/auth/phone/send`);
      console.log('🔍 Phone number:', phoneNumber);
    }
    
    const response = await api.post("/auth/phone/send", { phoneNumber });
    
    if (__DEV__) {
      console.log('✅ Phone auth response:', response.data);
    }
    
    return response.data;
  }).catch(error => {
    if (__DEV__) {
      console.error('❌ Phone auth error - Full details:');
      console.error('  Code:', error.code);
      console.error('  Message:', error.message);
      console.error('  Response:', error.response?.data);
      console.error('  Status:', error.response?.status);
      console.error('  Config URL:', error.config?.url);
      console.error('  Base URL:', error.config?.baseURL);
    }
    throw error;
  });
};

export const verifyPhoneOTP = async (phoneNumber, code) => {
  return executeWithRetry(async () => {
    const response = await api.post("/auth/phone/verify", {
      phoneNumber,
      code,
    });
    if (response.data.token) {
      await AsyncStorage.setItem("userToken", response.data.token);
      await AsyncStorage.setItem("userData", JSON.stringify(response.data));
    }
    return response.data;
  });
};

export const requestPasswordReset = async (email) => {
  return executeWithRetry(async () => {
    const response = await api.post("/auth/reset-password", { email });
    return response.data;
  });
};

export const confirmPasswordReset = async (resetToken, newPassword) => {
  return executeWithRetry(async () => {
    const response = await api.post("/auth/reset-password/confirm", {
      resetToken,
      newPassword,
    });
    return response.data;
  });
};
