import { io } from "socket.io-client";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { AppState } from 'react-native';


// const SOCKET_URL = "https://dating-5sfs.onrender.com";
const SOCKET_URL = "http://192.168.1.8:5001";



class SocketService {
  constructor() {
    this.socket = null;
    this.connected = false;
    this.listenerQueue = [];
    this.appStateSubscription = null;
    
    // Setup AppState listener
    this.setupAppStateListener();
  }

  setupAppStateListener() {
    this.appStateSubscription = AppState.addEventListener('change', nextAppState => {
      console.log('AppState changed to:', nextAppState);
      if (nextAppState === 'active') {
        console.log('App returned to foreground - Reconnecting socket if needed');
        if (!this.socket || !this.connected) {
           this.connect();
        }
      } else if (nextAppState.match(/inactive|background/)) {
        console.log('App went to background/inactive - Force disconnecting socket');
        // Explicitly tell server we are going offline before cutting connection
        if (this.socket && this.connected) {
          this.socket.emit('set_offline');
        }
        this.disconnect();
      }
    });
  }

  async connect() {
    if (this.connected) return;

    try {
      const token = await AsyncStorage.getItem("userToken");
      if (!token) {
        console.error("No auth token found");
        return;
      }

      this.socket = io(SOCKET_URL, {
        auth: { token },
        transports: ["websocket"],
      });

      this.socket.on("connect", () => {
        console.log("Socket connected");
        this.connected = true;

        // Process queued listeners
        while (this.listenerQueue.length > 0) {
          const { event, callback } = this.listenerQueue.shift();
          this.socket.on(event, callback);
        }
      });

      this.socket.on("disconnect", () => {
        console.log("Socket disconnected");
        this.connected = false;
      });

      this.socket.on("connect_error", (error) => {
        console.error("Socket connection error:", error);
      });
    } catch (error) {
      console.error("Socket connect error:", error);
    }
  }

  disconnect() {
    if (this.socket) {
      try {
        // Remove all listeners before disconnecting
        this.socket.removeAllListeners();
        this.socket.disconnect();
      } catch (error) {
        console.warn("Error disconnecting socket:", error);
      } finally {
        this.socket = null;
        this.connected = false;
        // Keep listeners in queue so they re-attach on reconnect
        // this.listenerQueue = []; 
      }
    }
  }

  // Send a message (updated with replyTo and metadata)
  sendMessage(
    receiverId,
    content,
    tempId,
    messageType = "text",
    fileUrl = null,
    duration = null,
    replyTo = null,
    metadata = {}
  ) {
    if (!this.socket) return;
    this.socket.emit("send_message", {
      receiverId,
      content,
      tempId,
      messageType,
      audioUrl: messageType === "audio" ? fileUrl : null,
      audioDuration: duration,
      imageUrl: messageType === "image" ? fileUrl : null,
      isViewOnce: metadata.isViewOnce || false,
      stickerEmoji: metadata.stickerEmoji || null,
      stickerId: metadata.stickerId || null,
      fileName: messageType === "file" ? metadata.fileName : null,
      fileSize: messageType === "file" ? metadata.fileSize : null,
      fileUrl: messageType === "file" ? fileUrl : null,
      replyTo,
      bypassProfanityCheck: metadata.bypassProfanityCheck || false,
    });
  }

  // Send typing indicator
  sendTyping(receiverId, isTyping) {
    if (!this.socket) return;
    this.socket.emit("typing", { receiverId, isTyping });
  }

  // Send recording indicator
  sendRecording(receiverId, isRecording) {
    if (!this.socket) return;
    this.socket.emit("recording", { receiverId, isRecording });
  }

  // Mark messages as read
  markAsRead(conversationId) {
    if (!this.socket) return;
    this.socket.emit("mark_read", { conversationId });
  }

  // Pin/Unpin message
  pinMessage(messageId, conversationId, pin) {
    if (!this.socket) return;
    this.socket.emit("message_pin", { messageId, conversationId, pin });
  }

  // Delete message
  deleteMessage(messageId, deleteForEveryone) {
    if (!this.socket) return;
    this.socket.emit("message_delete", { messageId, deleteForEveryone });
  }

  // Star/Unstar message
  starMessage(messageId, star) {
    if (!this.socket) return;
    this.socket.emit("message_star", { messageId, star });
  }

  // Generic listener handler
  addListener(event, callback) {
    if (this.socket && this.connected) {
      this.socket.on(event, callback);
    } 
    // Always add to queue slightly differently to handle re-connections? 
    // Actually, we should allow adding to queue even if connected if we want persistent listeners 
    // but the current implementation clears queue after connect. 
    // Let's just push to queue if not connected.
    if (!this.connected) {
      this.listenerQueue.push({ event, callback });
    }
  }

  // Listen for new messages
  onNewMessage(callback) {
    this.addListener("new_message", callback);
  }

  // Listen for message sent confirmation
  onMessageSent(callback) {
    this.addListener("message_sent", callback);
  }

  // Listen for message errors (e.g., profanity detected)
  onMessageError(callback) {
    this.addListener("message_error", callback);
  }

  // Listen for typing indicator
  onUserTyping(callback) {
    this.addListener("user_typing", callback);
  }

  // Listen for recording indicator
  onUserRecording(callback) {
    this.addListener("user_recording", callback);
  }

  // Listen for message pinned
  onMessagePinned(callback) {
    this.addListener("message_pinned", callback);
  }

  // Listen for message starred
  onMessageStarred(callback) {
    this.addListener("message_starred", callback);
  }

  // Listen for message deleted
  onMessageDeleted(callback) {
    this.addListener("message_deleted", callback);
  }

  // Acknowledge message delivery
  ackDelivered(messageId, senderId) {
    if (!this.socket) return;
    this.socket.emit("ack_delivered", { messageId, senderId });
  }

  // Listen for delivery receipts
  onMessageDelivered(callback) {
    this.addListener("message_delivered", callback);
  }

  // Listen for read receipts
  onMessagesRead(callback) {
    this.addListener("messages_read", callback);
  }

  // Join chat room (presence)
  joinChat(receiverId) {
    if (!this.socket) return;
    this.socket.emit("join_chat", { receiverId });
  }

  // Leave chat room (presence)
  leaveChat(receiverId) {
    if (!this.socket) return;
    this.socket.emit("leave_chat", { receiverId });
  }

  // Listen for user joined chat
  onUserJoinedChat(callback) {
    this.addListener("user_joined_chat", callback);
  }

  // Listen for user left chat
  onUserLeftChat(callback) {
    this.addListener("user_left_chat", callback);
  }

  // Acknowledge presence
  ackPresence(receiverId) {
    if (!this.socket) return;
    this.socket.emit("chat_presence_ack", { receiverId });
  }

  // Listen for presence acknowledgment
  onPresenceAck(callback) {
    this.addListener("chat_presence_ack", callback);
  }

  // Remove listeners
  removeListener(eventName) {
    if (this.socket) {
      try {
        this.socket.off(eventName);
      } catch (error) {
        console.warn("Error removing listener:", error);
      }
    }
    // Also remove from queue if present
    this.listenerQueue = this.listenerQueue.filter(
      (item) => item.event !== eventName
    );
  }

  // Remove all listeners (useful for cleanup)
  removeAllListeners() {
    if (this.socket) {
      try {
        this.socket.removeAllListeners();
      } catch (error) {
        console.warn("Error removing all listeners:", error);
      }
    }
    this.listenerQueue = [];
  }

  // ============ WebRTC Methods ============

  // Emit WebRTC offer
  emit(event, data) {
    if (!this.socket) return;
    this.socket.emit(event, data);
  }

  // Listen for incoming call
  onIncomingCall(callback) {
    this.addListener("incoming_call", callback);
  }

  // Listen for WebRTC offer
  onWebRTCOffer(callback) {
    this.addListener("webrtc_offer", callback);
  }

  // Listen for WebRTC answer
  onWebRTCAnswer(callback) {
    this.addListener("webrtc_answer", callback);
  }

  // Listen for ICE candidate
  onICECandidate(callback) {
    this.addListener("ice_candidate", callback);
  }

  // Listen for call accepted
  onCallAccepted(callback) {
    this.addListener("call_accepted", callback);
  }

  // Listen for call rejected
  onCallRejected(callback) {
    this.addListener("call_rejected", callback);
  }

  // Listen for call ended
  onCallEnded(callback) {
    this.addListener("call_ended", callback);
  }

  // View Once methods
  notifyViewOnceOpened(messageId) {
    if (!this.socket) return;
    this.socket.emit("view_once_opened", { messageId });
  }

  onViewOnceOpened(callback) {
    this.addListener("view_once_opened", callback);
  }

  // ============ Location & Connect Now Methods ============

  // Update user location
  updateLocation(latitude, longitude) {
    if (!this.socket) return;
    this.socket.emit("update_location", { latitude, longitude });
  }

  // Toggle Connect Now feature
  toggleConnectNow(enabled) {
    if (!this.socket) return;
    this.socket.emit("toggle_connect_now", { enabled });
  }

  // Listen for location update confirmation
  onLocationUpdated(callback) {
    this.addListener("location_updated", callback);
  }

  // Listen for location errors
  onLocationError(callback) {
    this.addListener("location_error", callback);
  }

  // Listen for Connect Now toggle confirmation
  onConnectNowToggled(callback) {
    this.addListener("connect_now_toggled", callback);
  }

  // Listen for Connect Now errors
  onConnectNowError(callback) {
    this.addListener("connect_now_error", callback);
  }

  // Listen for nearby user entered proximity
  onNearbyUserEntered(callback) {
    this.addListener("nearby_user_entered", callback);
  }

  // Listen for nearby user left proximity
  onNearbyUserLeft(callback) {
    this.addListener("nearby_user_left", callback);
  }

  // ============ Presence System Methods ============

  // Subscribe to a user's presence updates
  subscribePresence(userId) {
    if (!this.socket) return;
    this.socket.emit('subscribe_presence', { userId });
  }

  // Unsubscribe from a user's presence updates
  unsubscribePresence(userId) {
    if (!this.socket) return;
    this.socket.emit('unsubscribe_presence', { userId });
  }

  // Listen for presence status changes
  onUserStatusChange(callback) {
    this.addListener('user_status_change', callback);
  }
}

const socketService = new SocketService();
export default socketService;
