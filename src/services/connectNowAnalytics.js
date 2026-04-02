/**
 * ConnectNow-specific analytics events
 * Wraps the base analytics service with ConnectNow-specific event tracking
 */

import analyticsService from './analytics';

/**
 * Track ConnectNow toggle events
 */
export const trackConnectNowToggle = (enabled, context = {}) => {
  analyticsService.logEvent('connect_now_toggled', {
    enabled,
    ...context,
  });
};

/**
 * Track location permission events
 */
export const trackLocationPermission = (status, canAskAgain, context = {}) => {
  analyticsService.logEvent('location_permission', {
    status,
    canAskAgain,
    ...context,
  });
};

/**
 * Track location update events
 */
export const trackLocationUpdate = (success, duration, error = null, context = {}) => {
  if (success) {
    analyticsService.logPerformance('location_update_duration', duration, context);
  } else {
    analyticsService.logError('location_update_failed', error, context);
  }
};

/**
 * Track nearby users loaded
 */
export const trackNearbyUsersLoaded = (count, duration, context = {}) => {
  analyticsService.logEvent('nearby_users_loaded', {
    count,
    duration,
    ...context,
  });
  analyticsService.logPerformance('nearby_users_load_duration', duration, {
    count,
    ...context,
  });
};

/**
 * Track quick hello sent
 */
export const trackQuickHelloSent = (success, matchStatus, duration, error = null, context = {}) => {
  analyticsService.logEvent('quick_hello_sent', {
    success,
    matchStatus,
    duration,
    ...context,
  });
  
  if (success) {
    analyticsService.logPerformance('quick_hello_duration', duration, context);
  } else {
    analyticsService.logError('quick_hello_failed', error, context);
  }
};

/**
 * Track match acceptance/decline
 */
export const trackMatchResponse = (action, success, duration, error = null, context = {}) => {
  analyticsService.logEvent('match_response', {
    action, // 'accept' or 'decline'
    success,
    duration,
    ...context,
  });
  
  if (!success) {
    analyticsService.logError('match_response_failed', error, {
      action,
      ...context,
    });
  }
};

/**
 * Track profile view from ConnectNow
 */
export const trackProfileView = (source, context = {}) => {
  analyticsService.logEvent('profile_view', {
    source: 'connect_now',
    ...source,
    ...context,
  });
};

/**
 * Track view mode change (list/map)
 */
export const trackViewModeChange = (mode, context = {}) => {
  analyticsService.logEvent('connect_now_view_mode_changed', {
    mode,
    ...context,
  });
};

/**
 * Track tab filter change (nearby/requests)
 */
export const trackTabFilterChange = (tab, context = {}) => {
  analyticsService.logEvent('connect_now_tab_changed', {
    tab,
    ...context,
  });
};

/**
 * Track socket reconnection
 */
export const trackSocketReconnect = (attemptNumber, success, context = {}) => {
  analyticsService.logEvent('socket_reconnected', {
    attemptNumber,
    success,
    ...context,
  });
  
  if (!success) {
    analyticsService.logError('socket_reconnect_failed', `Failed after ${attemptNumber} attempts`, context);
  }
};

/**
 * Track API call performance
 */
export const trackAPICall = (endpoint, method, duration, success, error = null, context = {}) => {
  analyticsService.logPerformance(`api_call_${endpoint}`, duration, {
    method,
    success,
    ...context,
  });
  
  if (!success) {
    analyticsService.logError('api_call_failed', error, {
      endpoint,
      method,
      ...context,
    });
  }
};

/**
 * Track ConnectNow screen view
 */
export const trackConnectNowScreenView = (context = {}) => {
  analyticsService.logScreenView('ConnectNow', context);
};

/**
 * Track offline state
 */
export const trackOfflineState = (isOffline, duration = null, context = {}) => {
  analyticsService.logEvent('connect_now_offline_state', {
    isOffline,
    duration,
    ...context,
  });
};

/**
 * Track map interaction (cluster tap, marker tap)
 */
export const trackMapInteraction = (interactionType, context = {}) => {
  analyticsService.logEvent('connect_now_map_interaction', {
    interactionType, // 'cluster_tap', 'marker_tap', 'zoom'
    ...context,
  });
};
