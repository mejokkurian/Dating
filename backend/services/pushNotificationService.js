/**
 * Push Notification Service
 * Centralized service for sending push notifications via Expo
 */
const { Expo } = require('expo-server-sdk');
const User = require('../models/User');
const NOTIFICATION_TYPES = require('./notifications/notificationTypes');

class PushNotificationService {
  constructor() {
    // Create a new Expo SDK client
    // EXPO_ACCESS_TOKEN is OPTIONAL - notifications work without it
    // Get token from: https://expo.dev/accounts/[your-account]/settings/access-tokens
    // See PUSH_NOTIFICATIONS_SETUP.md for details
    this.expo = new Expo({
      accessToken: process.env.EXPO_ACCESS_TOKEN || undefined, // Optional, for higher rate limits
      useFcmV1: true, // Use FCM v1 API
    });
  }

  /**
   * Validate Expo push token format
   * @param {string} token - Push token to validate
   * @returns {boolean}
   */
  validateToken(token) {
    if (!token || typeof token !== 'string') {
      return false;
    }
    // Expo push tokens start with ExponentPushToken or ExpoPushToken
    return Expo.isExpoPushToken(token);
  }

  /**
   * Get push tokens for a user
   * @param {string} userId - User ID
   * @returns {Promise<string[]>} - Array of valid push tokens
   */
  async getUserPushTokens(userId) {
    try {
      const user = await User.findById(userId).select('pushTokens pushNotificationsEnabled');
      if (!user) {
        console.log(`User ${userId} not found when getting push tokens`);
        return [];
      }
      
      if (!user.pushNotificationsEnabled) {
        console.log(`Push notifications disabled for user ${userId}`);
        return [];
      }
      
      if (!user.pushTokens || user.pushTokens.length === 0) {
        console.log(`No push tokens found for user ${userId}`);
        return [];
      }
      
      const tokens = user.pushTokens
        .map(t => t.token || t) // Handle both object and string formats
        .filter(token => token && this.validateToken(token));
      
      console.log(`Found ${tokens.length} valid push token(s) for user ${userId}`);
      return tokens;
    } catch (error) {
      console.error('Error getting user push tokens:', error);
      return [];
    }
  }

  /**
   * Send notification to a user
   * @param {string} userId - User ID
   * @param {Object} notification - Notification payload (without 'to' field)
   * @returns {Promise<Object>} - Result object
   */
  async sendNotification(userId, notification) {
    try {
      console.log(`\n🔔 ========== NOTIFICATION SEND ATTEMPT ==========`);
      console.log(`📋 User ID: ${userId}`);
      console.log(`📋 Notification Type: ${notification.data?.type || 'unknown'}`);
      console.log(`📋 Title: ${notification.title}`);
      console.log(`📋 Body: ${notification.body?.substring(0, 50)}...`);
      
      // Check if notifications are enabled globally
      if (process.env.NOTIFICATION_ENABLED === 'false') {
        console.log('❌ Notifications disabled globally (NOTIFICATION_ENABLED=false)');
        return { success: false, reason: 'disabled' };
      }
      console.log('✅ Global notifications enabled');

      // Get user and check preferences first
      const user = await User.findById(userId);
      if (!user) {
        console.log(`❌ User ${userId} not found when sending notification`);
        return { success: false, reason: 'user_not_found' };
      }
      console.log(`✅ User found: ${user.displayName || user.email}`);

      if (!user.pushNotificationsEnabled) {
        console.log(`❌ Push notifications disabled for user ${userId} (pushNotificationsEnabled=false)`);
        return { success: false, reason: 'disabled_by_user' };
      }
      console.log(`✅ User has notifications enabled`);

      // Get user's push tokens
      const tokens = await this.getUserPushTokens(userId);
      if (tokens.length === 0) {
        console.log(`❌ No valid push tokens for user ${userId}`);
        console.log(`   User has ${user.pushTokens?.length || 0} token(s) in database`);
        if (user.pushTokens?.length > 0) {
          console.log(`   Tokens in DB:`, user.pushTokens.map(t => ({
            token: t.token?.substring(0, 30) + '...',
            valid: this.validateToken(t.token)
          })));
        }
        return { success: false, reason: 'no_tokens' };
      }
      console.log(`✅ Found ${tokens.length} valid push token(s)`);
      tokens.forEach((token, i) => {
        console.log(`   Token ${i + 1}: ${token.substring(0, 30)}...`);
      });

      // Check specific notification preference based on type
      const notificationType = notification.data?.type;
      if (notificationType === NOTIFICATION_TYPES.MESSAGE && !user.notificationPreferences?.messages) {
        console.log(`❌ Message notifications disabled in user preferences`);
        return { success: false, reason: 'preference_disabled' };
      }
      if (notificationType === NOTIFICATION_TYPES.NEARBY_USER && !user.notificationPreferences?.nearbyUsers) {
        console.log(`❌ Nearby user notifications disabled in user preferences`);
        return { success: false, reason: 'preference_disabled' };
      }
      if (notificationType === NOTIFICATION_TYPES.MATCH && !user.notificationPreferences?.matches) {
        console.log(`❌ Match notifications disabled in user preferences`);
        return { success: false, reason: 'preference_disabled' };
      }
      console.log(`✅ Notification type preferences allow sending`);

      // Send to all user's devices
      console.log(`📤 Sending notification to ${tokens.length} device(s)...`);
      const results = await this.sendBatchNotifications(tokens.map(token => ({
        ...notification,
        to: token,
      })));

      console.log(`✅ Notification sent successfully`);
      console.log(`📊 Results:`, JSON.stringify(results, null, 2));
      console.log(`🔔 ========== END NOTIFICATION ATTEMPT ==========\n`);
      
      return { success: true, results };
    } catch (error) {
      console.error('❌ Error sending notification:', error);
      console.error('Stack trace:', error.stack);
      console.log(`🔔 ========== END NOTIFICATION ATTEMPT (ERROR) ==========\n`);
      return { success: false, error: error.message };
    }
  }

  /**
   * Send batch of notifications
   * @param {Array<Object>} notifications - Array of notification objects with 'to' field
   * @returns {Promise<Object>} - Result object with receipts
   */
  async sendBatchNotifications(notifications) {
    if (!notifications || notifications.length === 0) {
      return { receipts: [] };
    }

    // Filter out invalid tokens
    const validNotifications = notifications.filter(notif => 
      this.validateToken(notif.to)
    );

    if (validNotifications.length === 0) {
      console.warn('No valid push tokens in batch');
      return { receipts: [] };
    }

    try {
      // Split notifications into chunks of 100 (Expo limit)
      const chunks = this.chunkArray(validNotifications, 100);
      const allReceipts = [];

      for (const chunk of chunks) {
        const tickets = await this.expo.sendPushNotificationsAsync(chunk);
        
        // Check ticket errors
        const receiptIds = [];
        tickets.forEach((ticket, index) => {
          if (ticket.status === 'error') {
            console.error('Ticket error:', ticket.message);
            // Handle invalid tokens
            if (ticket.details && ticket.details.error === 'DeviceNotRegistered') {
              // Token is invalid, should be removed from user's tokens
              console.log(`Invalid token detected: ${chunk[index].to}`);
            }
          } else if (ticket.status === 'ok') {
            receiptIds.push(ticket.id);
          }
        });

        // Get receipts if any
        if (receiptIds.length > 0) {
          const receipts = await this.expo.getPushNotificationReceiptsAsync(receiptIds);
          allReceipts.push(...Object.values(receipts));
        }
      }

      return { receipts: allReceipts };
    } catch (error) {
      console.error('Error sending batch notifications:', error);
      throw error;
    }
  }

  /**
   * Handle errors from notification receipts
   * @param {Object} receipts - Receipts from Expo
   */
  async handleErrors(receipts) {
    if (!receipts || typeof receipts !== 'object') {
      return;
    }

    for (const receiptId in receipts) {
      const receipt = receipts[receiptId];
      
      if (receipt.status === 'error') {
        if (receipt.message) {
          console.error(`Receipt error for ${receiptId}:`, receipt.message);
        }
        
        // Handle specific error types
        if (receipt.details && receipt.details.error) {
          const errorCode = receipt.details.error;
          
          // Remove invalid tokens
          if (errorCode === 'DeviceNotRegistered' || 
              errorCode === 'InvalidCredentials' ||
              errorCode === 'MessageTooBig') {
            // Note: We'd need the token to remove it, which isn't in the receipt
            // This should be handled when sending notifications
            console.log(`Error code ${errorCode} for receipt ${receiptId}`);
          }
        }
      }
    }
  }

  /**
   * Helper to split array into chunks
   * @param {Array} array - Array to chunk
   * @param {number} chunkSize - Size of each chunk
   * @returns {Array<Array>} - Array of chunks
   */
  chunkArray(array, chunkSize) {
    const chunks = [];
    for (let i = 0; i < array.length; i += chunkSize) {
      chunks.push(array.slice(i, i + chunkSize));
    }
    return chunks;
  }
}

// Export singleton instance
module.exports = new PushNotificationService();

