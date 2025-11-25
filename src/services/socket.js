import { io } from 'socket.io-client';
import AsyncStorage from '@react-native-async-storage/async-storage';

const SOCKET_URL = 'http://192.168.1.7:5001'; // Update with your backend URL

class SocketService {
  constructor() {
    this.socket = null;
    this.connected = false;
  }

  async connect() {
    if (this.connected) return;

    try {
      const token = await AsyncStorage.getItem('userToken');
      if (!token) {
        console.error('No auth token found');
        return;
      }

      this.socket = io(SOCKET_URL, {
        auth: { token },
        transports: ['websocket'],
      });

      this.socket.on('connect', () => {
        console.log('Socket connected');
        this.connected = true;
      });

      this.socket.on('disconnect', () => {
        console.log('Socket disconnected');
        this.connected = false;
      });

      this.socket.on('connect_error', (error) => {
        console.error('Socket connection error:', error);
      });
    } catch (error) {
      console.error('Socket connect error:', error);
    }
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.connected = false;
    }
  }

  // Send a message
  sendMessage(receiverId, content, tempId) {
    if (!this.socket) return;
    this.socket.emit('send_message', { receiverId, content, tempId });
  }

  // Send typing indicator
  sendTyping(receiverId, isTyping) {
    if (!this.socket) return;
    this.socket.emit('typing', { receiverId, isTyping });
  }

  // Mark messages as read
  markAsRead(conversationId) {
    if (!this.socket) return;
    this.socket.emit('mark_read', { conversationId });
  }

  // Listen for new messages
  onNewMessage(callback) {
    if (!this.socket) return;
    this.socket.on('new_message', callback);
  }

  // Listen for message sent confirmation
  onMessageSent(callback) {
    if (!this.socket) return;
    this.socket.on('message_sent', callback);
  }

  // Listen for typing indicator
  onUserTyping(callback) {
    if (!this.socket) return;
    this.socket.on('user_typing', callback);
  }

  // Listen for read receipts
  onMessagesRead(callback) {
    if (!this.socket) return;
    this.socket.on('messages_read', callback);
  }

  // Remove listeners
  off(event) {
    if (!this.socket) return;
    this.socket.off(event);
  }
}

export default new SocketService();
