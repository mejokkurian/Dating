/**
 * Discover Screen-specific analytics events
 * Wraps the base analytics service with Discover-specific event tracking
 */

import analyticsService from './analytics';

/**
 * Track Discover screen view
 */
export const trackDiscoverScreenView = (context = {}) => {
  analyticsService.logScreenView('Discover', context);
};

/**
 * Track profile swipe actions
 */
export const trackSwipeAction = (action, profileId, success, error = null, context = {}) => {
  if (success) {
    analyticsService.logEvent('profile_swiped', {
      action, // 'LIKE', 'PASS', 'SUPERLIKE'
      profileId,
      ...context,
    });
  } else {
    analyticsService.logError('swipe_action_failed', error, {
      action,
      profileId,
      ...context,
    });
  }
};

/**
 * Track profile loaded
 */
export const trackProfilesLoaded = (count, duration, context = {}) => {
  analyticsService.logEvent('profiles_loaded', {
    count,
    duration,
    ...context,
  });
  analyticsService.logPerformance('profiles_load_duration', duration, {
    count,
    ...context,
  });
};

/**
 * Track profile view (when user taps card)
 */
export const trackProfileView = (profileId, context = {}) => {
  analyticsService.logEvent('profile_viewed', {
    profileId,
    source: 'discover',
    ...context,
  });
};

/**
 * Track filter applied
 */
export const trackFilterApplied = (filters, context = {}) => {
  analyticsService.logEvent('filter_applied', {
    ...filters,
    ...context,
  });
};

/**
 * Track match request sent
 */
export const trackMatchRequest = (profileId, success, error = null, context = {}) => {
  if (success) {
    analyticsService.logEvent('match_request_sent', {
      profileId,
      ...context,
    });
  } else {
    analyticsService.logError('match_request_failed', error, {
      profileId,
      ...context,
    });
  }
};

/**
 * Track rate limit hit
 */
export const trackRateLimitHit = (action, waitTime, context = {}) => {
  analyticsService.logEvent('rate_limit_hit', {
    action,
    waitTime,
    ...context,
  });
};

/**
 * Track undo action
 */
export const trackUndoAction = (context = {}) => {
  analyticsService.logEvent('swipe_undone', context);
};

/**
 * Track tutorial events
 */
export const trackTutorialEvent = (event, step, context = {}) => {
  analyticsService.logEvent('tutorial_event', {
    event, // 'started', 'completed', 'skipped', 'step_viewed'
    step,
    ...context,
  });
};

/**
 * Track empty state actions
 */
export const trackEmptyStateAction = (action, context = {}) => {
  analyticsService.logEvent('empty_state_action', {
    action, // 'refresh', 'filter'
    ...context,
  });
};
