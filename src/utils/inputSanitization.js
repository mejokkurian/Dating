/**
 * Input sanitization utilities
 * Sanitizes user input to prevent XSS and other security issues
 */

/**
 * Remove potentially dangerous characters and patterns
 * @param {string} input - User input string
 * @returns {string} - Sanitized string
 */
export const sanitizeText = (input) => {
  if (!input || typeof input !== 'string') {
    return '';
  }

  let sanitized = input.trim();

  // Remove null bytes and other control characters (except newlines and tabs)
  sanitized = sanitized.replace(/[\x00-\x08\x0B-\x0C\x0E-\x1F\x7F]/g, '');

  // Remove zero-width characters
  sanitized = sanitized.replace(/[\u200B-\u200D\uFEFF]/g, '');

  // Remove script tags and event handlers (basic XSS prevention)
  sanitized = sanitized.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
  sanitized = sanitized.replace(/on\w+\s*=\s*["'][^"']*["']/gi, '');
  sanitized = sanitized.replace(/on\w+\s*=\s*[^\s>]*/gi, '');

  // Remove javascript: and data: URLs
  sanitized = sanitized.replace(/javascript:/gi, '');
  sanitized = sanitized.replace(/data:text\/html/gi, '');

  // Remove HTML tags (basic protection)
  sanitized = sanitized.replace(/<[^>]+>/g, '');

  // Normalize whitespace (collapse multiple spaces, but preserve newlines)
  sanitized = sanitized.replace(/[ \t]+/g, ' ');

  // Limit consecutive newlines to prevent abuse
  sanitized = sanitized.replace(/\n{4,}/g, '\n\n\n');

  return sanitized.trim();
};

/**
 * Sanitize message text specifically for Quick Hello
 * Allows emojis and basic formatting but removes dangerous content
 * @param {string} message - Message text
 * @returns {string} - Sanitized message
 */
export const sanitizeMessage = (message) => {
  if (!message || typeof message !== 'string') {
    return '';
  }

  // First apply basic sanitization
  let sanitized = sanitizeText(message);

  // For messages, we want to preserve:
  // - Emojis (Unicode ranges)
  // - Basic punctuation
  // - Newlines (limited)
  // - Spaces

  // Remove any remaining potentially dangerous patterns
  // Remove SQL injection patterns (basic)
  sanitized = sanitized.replace(/('|(\\')|(;)|(\\)|(\|)|(\*)|(%)|(@)|(\[)|(\]))/g, (match) => {
    // Allow single quotes if they're part of normal text (like "don't")
    // But remove if they look like SQL injection attempts
    if (match === "'" && sanitized.indexOf("'") === sanitized.lastIndexOf("'")) {
      return match; // Single quote, likely part of normal text
    }
    // Remove other dangerous characters
    if ([';', '\\', '|', '*', '%', '@', '[', ']'].includes(match)) {
      return '';
    }
    return match;
  });

  // Remove excessive special characters that might be used for injection
  sanitized = sanitized.replace(/[<>{}]/g, '');

  return sanitized.trim();
};

/**
 * Validate message length and content
 * @param {string} message - Message text
 * @param {number} maxLength - Maximum allowed length (default: 200)
 * @returns {{valid: boolean, error?: string}} - Validation result
 */
export const validateMessage = (message, maxLength = 200) => {
  if (!message || typeof message !== 'string') {
    return {
      valid: false,
      error: 'Message cannot be empty',
    };
  }

  const trimmed = message.trim();
  
  if (trimmed.length === 0) {
    return {
      valid: false,
      error: 'Message cannot be empty',
    };
  }

  if (trimmed.length > maxLength) {
    return {
      valid: false,
      error: `Message must be ${maxLength} characters or less`,
    };
  }

  // Check for only whitespace
  if (!trimmed.replace(/\s/g, '').length) {
    return {
      valid: false,
      error: 'Message cannot contain only whitespace',
    };
  }

  return { valid: true };
};

/**
 * Sanitize and validate message in one step
 * @param {string} message - Message text
 * @param {number} maxLength - Maximum allowed length (default: 200)
 * @returns {{valid: boolean, sanitized?: string, error?: string}} - Result with sanitized message
 */
export const sanitizeAndValidateMessage = (message, maxLength = 200) => {
  const sanitized = sanitizeMessage(message);
  const validation = validateMessage(sanitized, maxLength);

  if (!validation.valid) {
    return validation;
  }

  return {
    valid: true,
    sanitized,
  };
};
