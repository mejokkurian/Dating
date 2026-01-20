import * as SQLite from 'expo-sqlite';

let db = null;

/**
 * Initialize message cache database
 * Call this once on app startup
 */
export const initCache = () => {
  try {
    db = SQLite.openDatabaseSync('messages.db');
    
    // Create messages table
    db.execSync(`
      CREATE TABLE IF NOT EXISTS messages (
        id TEXT PRIMARY KEY,
        conversation_id TEXT NOT NULL,
        sender_id TEXT,
        receiver_id TEXT,
        content TEXT,
        message_type TEXT DEFAULT 'text',
        status TEXT DEFAULT 'sent',
        created_at INTEGER NOT NULL,
        reply_to_id TEXT,
        audio_url TEXT,
        audio_duration INTEGER,
        image_url TEXT,
        sticker_emoji TEXT,
        file_name TEXT,
        file_url TEXT,
        call_type TEXT,
        call_duration INTEGER,
        call_status TEXT
      );
    `);
    
    // Create conversations table (for MessagesScreen list)
    db.execSync(`
      CREATE TABLE IF NOT EXISTS conversations (
        conversation_id TEXT PRIMARY KEY,
        other_user_id TEXT,
        other_user_name TEXT,
        other_user_photo TEXT,
        last_message TEXT,
        last_message_time INTEGER,
        unread_count INTEGER DEFAULT 0,
        updated_at INTEGER
      );
    `);
    
    // Migration: Add call columns if they don't exist (for existing databases)
    try {
      db.execSync(`ALTER TABLE messages ADD COLUMN call_type TEXT;`);
      db.execSync(`ALTER TABLE messages ADD COLUMN call_duration INTEGER;`);
      db.execSync(`ALTER TABLE messages ADD COLUMN call_status TEXT;`);
      console.log('✅ Added call data columns to existing table');
    } catch (e) {
      // Columns already exist, ignore error
    }
    
    // Create index for fast queries
    db.execSync(`
      CREATE INDEX IF NOT EXISTS idx_conversation 
      ON messages(conversation_id, created_at DESC);
    `);
    
    console.log('✅ Message cache initialized');
  } catch (error) {
    console.error('❌ Failed to initialize message cache:', error);
  }
};

/**
 * Get cached messages for a conversation
 * @param {string} conversationId - The conversation ID (user1_user2)
 * @param {number} limit - Number of messages to fetch
 * @returns {Array} Array of messages
 */
export const getCachedMessages = (conversationId, limit = 50) => {
  if (!db) {
    console.warn('⚠️ Database not initialized');
    return [];
  }
  
  try {
    const messages = db.getAllSync(
      `SELECT * FROM messages 
       WHERE conversation_id = ? 
       ORDER BY created_at DESC 
       LIMIT ?`,
      [conversationId, limit]
    );
    
    // Convert back to format expected by UI
    return messages.map(msg => {
      const message = {
        _id: msg.id,
        conversationId: msg.conversation_id,
        senderId: { _id: msg.sender_id }, // Return as object for UI
        receiverId: msg.receiver_id,
        content: msg.content,
        messageType: msg.message_type,
        status: msg.status,
        createdAt: new Date(msg.created_at).toISOString(),
        replyTo: msg.reply_to_id,
        audioUrl: msg.audio_url,
        audioDuration: msg.audio_duration,
        imageUrl: msg.image_url,
        stickerEmoji: msg.sticker_emoji,
        fileName: msg.file_name,
        fileUrl: msg.file_url,
      };
      
      // Reconstruct callData if it's a call message
      if (msg.call_type) {
        message.callData = {
          callType: msg.call_type,
          duration: msg.call_duration,
          status: msg.call_status,
        };
      }
      
      return message;
    });
  } catch (error) {
    console.error('❌ Error getting cached messages:', error);
    return [];
  }
};

/**
 * Get the timestamp of the most recent message for incremental sync
 * @param {string} conversationId - The conversation ID
 * @returns {number} Timestamp of last message (0 if no messages)
 */
export const getLastSyncTime = (conversationId) => {
  if (!db) {
    return 0;
  }
  
  try {
    const result = db.getFirstSync(
      `SELECT MAX(created_at) as last_time 
       FROM messages 
       WHERE conversation_id = ?`,
      [conversationId]
    );
    
    return result?.last_time || 0;
  } catch (error) {
    console.error('❌ Error getting last sync time:', error);
    return 0;
  }
};

/**
 * Save a single message to cache
 * @param {Object} msg - Message object from API or Socket
 */
export const cacheMessage = (msg) => {
  if (!db) {
    console.warn('⚠️ Database not initialized');
    return;
  }
  
  try {
    db.runSync(
      `INSERT OR REPLACE INTO messages 
       (id, conversation_id, sender_id, receiver_id, content, message_type, 
        status, created_at, reply_to_id, audio_url, audio_duration, 
        image_url, sticker_emoji, file_name, file_url,
        call_type, call_duration, call_status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        msg._id,
        msg.conversationId,
        msg.senderId?._id || msg.senderId,
        msg.receiverId,
        msg.content || '',
        msg.messageType || 'text',
        msg.status || 'sent',
        new Date(msg.createdAt).getTime(),
        msg.replyTo?._id || msg.replyTo || null,
        msg.audioUrl || null,
        msg.audioDuration || null,
        msg.imageUrl || null,
        msg.stickerEmoji || null,
        msg.fileName || null,
        msg.fileUrl || null,
        msg.callData?.callType || null,
        msg.callData?.duration || null,
        msg.callData?.status || null,
      ]
    );
  } catch (error) {
    console.error('❌ Error caching message:', error);
  }
};

/**
 * Save multiple messages to cache (batch)
 * @param {Array} messages - Array of message objects
 */
export const cacheMessages = (messages) => {
  if (!messages || messages.length === 0) return;
  
  messages.forEach(msg => cacheMessage(msg));
  console.log(`✅ Cached ${messages.length} messages`);
};

/**
 * Cache a conversation (for MessagesScreen list)
 * @param {Object} conversation - Conversation object with match data
 */
export const cacheConversation = (conversation) => {
  if (!db) return;
  
  // Safety check: skip if no otherUser data
  if (!conversation.otherUser || !conversation.otherUser._id) {
    console.warn('⚠️ Skipping conversation cache - missing otherUser data');
    return;
  }
  
  try {
    db.runSync(
      `INSERT OR REPLACE INTO conversations 
       (conversation_id, other_user_id, other_user_name, other_user_photo, 
        last_message, last_message_time, unread_count, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        conversation.conversationId,
        conversation.otherUser._id,
        conversation.otherUser.displayName || '',
        conversation.otherUser.photos?.[0] || '',
        conversation.lastMessage?.content || '',
        conversation.lastMessage?.createdAt ? new Date(conversation.lastMessage.createdAt).getTime() : Date.now(),
        conversation.unreadCount || 0,
        Date.now(),
      ]
    );
  } catch (error) {
    console.error('❌ Error caching conversation:', error);
  }
};

/**
 * Get cached conversations
 * @returns {Array} Array of conversation objects
 */
export const getCachedConversations = () => {
  if (!db) return [];
  
  try {
    const conversations = db.getAllSync(
      `SELECT * FROM conversations 
       ORDER BY last_message_time DESC`
    );
    
    return conversations
      .filter(conv => conv.other_user_id) // Filter out conversations without user ID
      .map(conv => ({
        conversationId: conv.conversation_id,
        otherUser: {
          _id: conv.other_user_id,
          displayName: conv.other_user_name || 'Unknown',
          photos: conv.other_user_photo ? [conv.other_user_photo] : [],
        },
        lastMessage: conv.last_message ? {
          content: conv.last_message,
          createdAt: new Date(conv.last_message_time).toISOString(),
        } : null,
        unreadCount: conv.unread_count || 0,
        lastMessageAt: new Date(conv.last_message_time).toISOString(),
      }));
  } catch (error) {
    console.error('❌ Error getting cached conversations:', error);
    return [];
  }
};

/**
 * Clear all cached messages (for testing/debugging)
 */
export const clearCache = () => {
  if (!db) return;
  
  try {
    db.execSync('DELETE FROM messages');
    db.execSync('DELETE FROM conversations');
    console.log('✅ Cache cleared');
  } catch (error) {
    console.error('❌ Error clearing cache:', error);
  }
};
