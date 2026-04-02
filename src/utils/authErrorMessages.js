/**
 * Centralized Authentication Error Messages
 * Standardizes error messages across all auth screens
 */

export const AUTH_ERROR_MESSAGES = {
  // Network Errors
  NO_INTERNET: 'No internet connection. Please check your network and try again.',
  TIMEOUT: 'Request timed out. Please try again.',
  CONNECTION_ERROR: 'Cannot connect to server. Please check your connection.',
  
  // Validation Errors
  EMAIL_REQUIRED: 'Email is required',
  EMAIL_INVALID: 'Please enter a valid email address',
  PASSWORD_REQUIRED: 'Password is required',
  PASSWORD_TOO_SHORT: 'Password must be at least 8 characters',
  PASSWORD_TOO_LONG: 'Password must be less than 128 characters',
  PASSWORD_NO_UPPERCASE: 'Password must contain at least one uppercase letter',
  PASSWORD_NO_LOWERCASE: 'Password must contain at least one lowercase letter',
  PASSWORD_NO_NUMBER: 'Password must contain at least one number',
  PHONE_REQUIRED: 'Please enter a valid phone number',
  PHONE_INVALID: 'Please enter a valid phone number (7-15 digits)',
  OTP_REQUIRED: 'Please enter the complete 6-digit code',
  OTP_INVALID: 'Invalid verification code',
  
  // Authentication Errors
  INVALID_CREDENTIALS: 'Invalid email or password. Please try again.',
  USER_NOT_FOUND: 'No account found with this email. Please sign up.',
  EMAIL_ALREADY_EXISTS: 'This email is already registered. Please sign in instead.',
  WEAK_PASSWORD: 'Password is too weak. Use at least 8 characters with uppercase, lowercase, and numbers.',
  TOO_MANY_ATTEMPTS: 'Too many failed attempts. Please try again later.',
  ACCOUNT_LOCKED: 'Account temporarily locked due to too many failed attempts. Please try again later.',
  
  // Social Login Errors
  GOOGLE_LOGIN_FAILED: 'Google sign-in failed. Please try again.',
  APPLE_LOGIN_FAILED: 'Apple sign-in failed. Please try again.',
  SOCIAL_ACCOUNT_NOT_FOUND: 'We couldn\'t find an account with this ID. Redirecting you to sign up...',
  SOCIAL_ACCOUNT_EXISTS: 'You already have an account. Redirecting you to login...',
  
  // OTP Errors
  OTP_SEND_FAILED: 'Failed to send verification code. Please try again.',
  OTP_VERIFY_FAILED: 'Invalid verification code. Please try again.',
  OTP_RESEND_FAILED: 'Failed to resend OTP. Please try again.',
  OTP_RESEND_COOLDOWN: 'Please wait before requesting a new code.',
  
  // Rate Limiting
  RATE_LIMIT_DEBOUNCE: 'Please wait a moment before trying again.',
  RATE_LIMIT_PER_MINUTE: 'Too many attempts. Please wait a moment before trying again.',
  
  // Generic Errors
  UNKNOWN_ERROR: 'An error occurred. Please try again.',
  SIGNUP_FAILED: 'Failed to create account. Please try again.',
  LOGIN_FAILED: 'Failed to sign in. Please try again.',
};

/**
 * Get standardized error message from error object
 * @param {Error|Object} error - Error object from API or validation
 * @param {string} defaultMessage - Default message if error doesn't match known patterns
 * @returns {string} - Standardized error message
 */
export const getAuthErrorMessage = (error, defaultMessage = AUTH_ERROR_MESSAGES.UNKNOWN_ERROR) => {
  if (!error) {
    return defaultMessage;
  }

  // Handle string errors
  if (typeof error === 'string') {
    return error;
  }

  // Handle error objects with message property
  const errorMessage = error.message || error.error || error.msg;
  if (!errorMessage) {
    return defaultMessage;
  }

  // Map common error codes to standardized messages
  const errorCode = error.code || error.errorCode;
  
  switch (errorCode) {
    case 'auth/email-already-in-use':
    case 'EMAIL_ALREADY_EXISTS':
      return AUTH_ERROR_MESSAGES.EMAIL_ALREADY_EXISTS;
    
    case 'auth/invalid-email':
    case 'INVALID_EMAIL':
      return AUTH_ERROR_MESSAGES.EMAIL_INVALID;
    
    case 'auth/user-not-found':
    case 'USER_NOT_FOUND':
      return AUTH_ERROR_MESSAGES.USER_NOT_FOUND;
    
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
    case 'INVALID_CREDENTIALS':
      return AUTH_ERROR_MESSAGES.INVALID_CREDENTIALS;
    
    case 'auth/weak-password':
    case 'WEAK_PASSWORD':
      return AUTH_ERROR_MESSAGES.WEAK_PASSWORD;
    
    case 'auth/too-many-requests':
    case 'TOO_MANY_ATTEMPTS':
      return AUTH_ERROR_MESSAGES.TOO_MANY_ATTEMPTS;
    
    case 'auth/network-request-failed':
    case 'ECONNREFUSED':
    case 'ECONNABORTED':
    case 'TIMEOUT':
    case 'CONNECTION_ERROR':
      if (errorCode === 'TIMEOUT' || errorMessage.includes('timeout')) {
        return AUTH_ERROR_MESSAGES.TIMEOUT;
      }
      if (errorCode === 'CONNECTION_ERROR' || errorMessage.includes('connect')) {
        return AUTH_ERROR_MESSAGES.CONNECTION_ERROR;
      }
      return AUTH_ERROR_MESSAGES.NO_INTERNET;
    
    case 'ACCOUNT_LOCKED':
      return AUTH_ERROR_MESSAGES.ACCOUNT_LOCKED;
    
    default:
      // Check if error message contains known patterns
      const lowerMessage = errorMessage.toLowerCase();
      
      if (lowerMessage.includes('email') && lowerMessage.includes('already')) {
        return AUTH_ERROR_MESSAGES.EMAIL_ALREADY_EXISTS;
      }
      if (lowerMessage.includes('invalid') && (lowerMessage.includes('email') || lowerMessage.includes('password'))) {
        return AUTH_ERROR_MESSAGES.INVALID_CREDENTIALS;
      }
      if (lowerMessage.includes('not found') || lowerMessage.includes('user not found')) {
        return AUTH_ERROR_MESSAGES.USER_NOT_FOUND;
      }
      if (lowerMessage.includes('too many') || lowerMessage.includes('rate limit')) {
        return AUTH_ERROR_MESSAGES.TOO_MANY_ATTEMPTS;
      }
      if (lowerMessage.includes('network') || lowerMessage.includes('connection')) {
        return AUTH_ERROR_MESSAGES.NO_INTERNET;
      }
      
      // Return the error message if it's user-friendly, otherwise return default
      return errorMessage.length < 200 ? errorMessage : defaultMessage;
  }
};
