/**
 * Top Picks Screen-specific analytics events
 * Wraps the base analytics service with Top Picks-specific event tracking
 */

import analyticsService from './analytics';

/**
 * Track Top Picks screen view
 */
export const trackTopPicksScreenView = (context = {}) => {
  analyticsService.logScreenView('Top Picks', context);
};

/**
 * Track profile card tap
 */
export const trackProfileView = (profileId, context = {}) => {
  analyticsService.logEvent('top_pick_profile_viewed', {
    profileId,
    source: 'top_picks',
    ...context,
  });
};

/**
 * Track top picks loaded
 */
export const trackTopPicksLoaded = (count, loadTime = 0, context = {}) => {
  analyticsService.logEvent('top_picks_loaded', {
    count,
    loadTime,
    ...context,
  });
};

/**
 * Track API call success/failure
 */
export const trackAPICall = (success, error = null, context = {}) => {
  if (success) {
    analyticsService.logEvent('top_picks_api_success', context);
  } else {
    analyticsService.logError('top_picks_api_failed', error, {
      ...context,
    });
  }
};

/**
 * Track refresh action
 */
export const trackRefresh = (success, error = null, context = {}) => {
  analyticsService.logEvent('top_picks_refresh', {
    success,
    ...context,
  });
  
  if (!success && error) {
    analyticsService.logError('top_picks_refresh_failed', error, context);
  }
};

/**
 * Track empty state action
 */
export const trackEmptyStateAction = (action, context = {}) => {
  analyticsService.logEvent('top_picks_empty_state_action', {
    action,
    ...context,
  });
};

/**
 * Track error state retry
 */
export const trackErrorRetry = (errorType, context = {}) => {
  analyticsService.logEvent('top_picks_error_retry', {
    errorType,
    ...context,
  });
};

export default {
  trackTopPicksScreenView,
  trackProfileView,
  trackTopPicksLoaded,
  trackAPICall,
  trackRefresh,
  trackEmptyStateAction,
  trackErrorRetry,
};
