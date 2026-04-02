/**
 * Chat Analytics Service
 * Tracks chat-related events, errors, and performance metrics
 */

import analyticsService from './analytics';

/**
 * Track chat screen view
 */
export const trackChatScreenView = (otherUserId) => {
  analyticsService.logEvent('chat_screen_view', {
    other_user_id: otherUserId,
  });
};

/**
 * Track message sent
 */
export const trackMessageSent = (messageType, hasReply, messageLength) => {
  analyticsService.logEvent('message_sent', {
    message_type: messageType, // 'text', 'image', 'audio', 'file', 'sticker'
    has_reply: hasReply,
    message_length: messageLength,
  });
};

/**
 * Track message received
 */
export const trackMessageReceived = (messageType) => {
  analyticsService.logEvent('message_received', {
    message_type: messageType,
  });
};

/**
 * Track message send failure
 */
export const trackMessageSendFailed = (error, messageType) => {
  analyticsService.logError('message_send_failed', error, {
    message_type: messageType,
  });
};

/**
 * Track message action (pin, star, delete, reply)
 */
export const trackMessageAction = (action, messageType) => {
  analyticsService.logEvent('message_action', {
    action, // 'pin', 'star', 'delete', 'reply'
    message_type: messageType,
  });
};

/**
 * Track message action failure
 */
export const trackMessageActionFailed = (action, error) => {
  analyticsService.logError('message_action_failed', error, {
    action,
  });
};

/**
 * Track media upload
 */
export const trackMediaUpload = (mediaType, fileSize, success) => {
  analyticsService.logEvent('media_upload', {
    media_type: mediaType, // 'image', 'audio', 'file'
    file_size: fileSize,
    success,
  });
};

/**
 * Track media upload failure
 */
export const trackMediaUploadFailed = (mediaType, error, fileSize) => {
  analyticsService.logError('media_upload_failed', error, {
    media_type: mediaType,
    file_size: fileSize,
  });
};

/**
 * Track typing indicator
 */
export const trackTypingIndicator = (isTyping) => {
  analyticsService.logEvent('typing_indicator', {
    is_typing: isTyping,
  });
};

/**
 * Track rate limit hit
 */
export const trackRateLimitHit = (limitType) => {
  analyticsService.logEvent('rate_limit_hit', {
    limit_type: limitType, // 'message_send', 'message_per_minute'
  });
};

/**
 * Track profanity detected
 */
export const trackProfanityDetected = (messageLength, userBypassed) => {
  analyticsService.logEvent('profanity_detected', {
    message_length: messageLength,
    user_bypassed: userBypassed,
  });
};

/**
 * Track API call performance
 */
export const trackAPICall = (endpoint, duration, success) => {
  analyticsService.logPerformance('chat_api_call', duration, {
    endpoint,
    success,
  });
};

/**
 * Track socket reconnection
 */
export const trackSocketReconnection = (attemptNumber, success) => {
  analyticsService.logEvent('chat_socket_reconnection', {
    attempt_number: attemptNumber,
    success,
  });
};

/**
 * Track offline state
 */
export const trackOfflineState = (action) => {
  analyticsService.logEvent('chat_offline_state', {
    action, // 'message_send_blocked', 'api_call_failed'
  });
};

/**
 * Track error retry
 */
export const trackErrorRetry = (errorType) => {
  analyticsService.logEvent('chat_error_retry', {
    error_type: errorType,
  });
};

/**
 * Track conversation loaded
 */
export const trackConversationLoaded = (messageCount, fromCache) => {
  analyticsService.logEvent('conversation_loaded', {
    message_count: messageCount,
    from_cache: fromCache,
  });
};

/**
 * Track message load more (pagination)
 */
export const trackMessageLoadMore = (messageCount) => {
  analyticsService.logEvent('message_load_more', {
    message_count: messageCount,
  });
};
