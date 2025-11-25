const jwt = require('jsonwebtoken');
const Message = require('../models/Message');
const Match = require('../models/Match');

// Helper to generate conversation ID from two user IDs
const getConversationId = (userId1, userId2) => {
  const ids = [userId1.toString(), userId2.toString()].sort();
  return `${ids[0]}_${ids[1]}`;
};

module.exports = (io) => {
  // Socket.IO middleware for JWT authentication
  io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    
    if (!token) {
      return next(new Error('Authentication error'));
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.userId = decoded.id;
      next();
    } catch (err) {
      next(new Error('Authentication error'));
    }
  });

  io.on('connection', (socket) => {
    console.log(`User connected: ${socket.userId}`);

    // Join user's personal room for direct messaging
    socket.join(socket.userId.toString());

    // Handle sending a message
    socket.on('send_message', async (data) => {
      try {
        const { receiverId, content } = data;
        const senderId = socket.userId;

        // Create conversation ID
        const conversationId = getConversationId(senderId, receiverId);

        // Save message to database
        const message = await Message.create({
          conversationId,
          senderId,
          receiverId,
          content,
        });

        // Update match's last message time
        await Match.findOneAndUpdate(
          {
            $or: [
              { user1Id: senderId, user2Id: receiverId },
              { user1Id: receiverId, user2Id: senderId },
            ],
          },
          { lastMessageAt: new Date() },
          { upsert: false }
        );

        // Populate sender info
        await message.populate('senderId', 'displayName photos');

        // Emit to sender (confirmation)
        socket.emit('message_sent', {
          ...message.toObject(),
          tempId: data.tempId, // For optimistic UI updates
        });

        // Emit to receiver (if online)
        io.to(receiverId.toString()).emit('new_message', message);

      } catch (error) {
        console.error('Send message error:', error);
        socket.emit('message_error', { error: error.message });
      }
    });

    // Handle typing indicator
    socket.on('typing', (data) => {
      const { receiverId, isTyping } = data;
      io.to(receiverId.toString()).emit('user_typing', {
        userId: socket.userId,
        isTyping,
      });
    });

    // Handle mark as read
    socket.on('mark_read', async (data) => {
      try {
        const { conversationId } = data;
        
        await Message.updateMany(
          {
            conversationId,
            receiverId: socket.userId,
            read: false,
          },
          {
            read: true,
            readAt: new Date(),
          }
        );

        // Notify sender that messages were read
        const messages = await Message.find({ conversationId });
        if (messages.length > 0) {
          const otherUserId = messages[0].senderId.toString() === socket.userId.toString()
            ? messages[0].receiverId
            : messages[0].senderId;
          
          io.to(otherUserId.toString()).emit('messages_read', {
            conversationId,
            readBy: socket.userId,
          });
        }
      } catch (error) {
        console.error('Mark read error:', error);
      }
    });

    // Handle disconnect
    socket.on('disconnect', () => {
      console.log(`User disconnected: ${socket.userId}`);
    });
  });
};
