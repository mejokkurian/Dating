/**
 * Analytics and Logging Service for ConnectNow
 * Tracks usage, errors, and performance metrics
 * Can be extended to integrate with analytics providers (Firebase Analytics, Mixpanel, etc.)
 */

class AnalyticsService {
  constructor() {
    this.enabled = true; // Can be toggled via config
    this.logLevel = __DEV__ ? 'debug' : 'error'; // Only log errors in production
    this.eventQueue = []; // Queue events if offline
    this.maxQueueSize = 100;
  }

  /**
   * Log an event with optional properties
   * @param {string} eventName - Name of the event
   * @param {Object} properties - Additional event properties
   */
  logEvent(eventName, properties = {}) {
    if (!this.enabled) return;

    const event = {
      name: eventName,
      properties: {
        ...properties,
        timestamp: new Date().toISOString(),
      },
    };

    // In development, log to console
    if (__DEV__) {
      console.log(`📊 Analytics Event: ${eventName}`, properties);
    }

    // In production, you would send to analytics service
    // Example: Firebase Analytics, Mixpanel, Amplitude, etc.
    // this.sendToAnalyticsService(event);

    // For now, we'll just log important events
    this.logToConsole(event);
  }

  /**
   * Log an error with context
   * @param {string} errorType - Type/category of error
   * @param {Error|string} error - Error object or message
   * @param {Object} context - Additional context about the error
   */
  logError(errorType, error, context = {}) {
    if (!this.enabled) return;

    const errorEvent = {
      type: 'error',
      errorType,
      error: error instanceof Error ? {
        message: error.message,
        stack: error.stack,
        code: error.code,
      } : { message: error },
      context: {
        ...context,
        timestamp: new Date().toISOString(),
      },
    };

    // Always log errors
    console.error(`❌ Analytics Error: ${errorType}`, errorEvent);

    // In production, send to error tracking service
    // Example: Sentry, Bugsnag, etc.
    // this.sendToErrorTracking(errorEvent);
  }

  /**
   * Log performance metric
   * @param {string} metricName - Name of the metric
   * @param {number} value - Metric value (duration, count, etc.)
   * @param {Object} properties - Additional properties
   */
  logPerformance(metricName, value, properties = {}) {
    if (!this.enabled) return;

    const metric = {
      type: 'performance',
      metricName,
      value,
      properties: {
        ...properties,
        timestamp: new Date().toISOString(),
      },
    };

    if (__DEV__) {
      console.log(`⏱️ Performance: ${metricName} = ${value}ms`, properties);
    }

    // In production, send to performance monitoring
    // Example: Firebase Performance, New Relic, etc.
  }

  /**
   * Log user action
   * @param {string} action - Action name
   * @param {Object} properties - Action properties
   */
  logUserAction(action, properties = {}) {
    this.logEvent(`user_action_${action}`, properties);
  }

  /**
   * Console logging (for development)
   */
  logToConsole(event) {
    // Only log important events in production
    const importantEvents = [
      'connect_now_toggled',
      'quick_hello_sent',
      'location_permission_denied',
      'location_update_failed',
    ];

    if (__DEV__ || importantEvents.includes(event.name)) {
      console.log(`[Analytics] ${event.name}`, event.properties);
    }
  }

  /**
   * Set user properties (for user identification in analytics)
   * @param {Object} userProperties - User properties to set
   */
  setUserProperties(userProperties) {
    if (!this.enabled) return;
    
    // In production, set user properties in analytics service
    // Example: Firebase Analytics setUserProperties
    if (__DEV__) {
      console.log('👤 User Properties:', userProperties);
    }
  }

  /**
   * Track screen view
   * @param {string} screenName - Name of the screen
   * @param {Object} properties - Additional properties
   */
  logScreenView(screenName, properties = {}) {
    this.logEvent('screen_view', {
      screen_name: screenName,
      ...properties,
    });
  }
}

// Create singleton instance
const analyticsService = new AnalyticsService();

export default analyticsService;
