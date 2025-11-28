const jwt = require('jsonwebtoken');
const Message = require('../models/Message');
const Match = require('../models/Match');
const User = require('../models/User');

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

        // Verify match status
        const match = await Match.findOne({
          $or: [
            { user1Id: senderId, user2Id: receiverId },
            { user1Id: receiverId, user2Id: senderId },
          ]
        });

        if (!match || match.status !== 'active') {
          throw new Error('Cannot send message to pending or unmatched user');
        }

        // Check if receiver is online (in their room)
        const sockets = await io.in(receiverId.toString()).fetchSockets();
        const isDelivered = sockets.length > 0;

        // Save message to database
        const messageData = {
          conversationId,
          senderId,
          receiverId,
          status: isDelivered ? 'delivered' : 'sent',
        };

        // Add message type specific fields
        if (data.messageType === 'audio') {
          messageData.messageType = 'audio';
          messageData.audioUrl = data.audioUrl;
          messageData.audioDuration = data.audioDuration;
          messageData.content = ''; // Empty content for audio
        } else {
          messageData.messageType = 'text';
          messageData.content = content;
        }

        // Add reply reference if provided
        if (data.replyTo) {
          messageData.replyTo = data.replyTo;
        }

        const message = await Message.create(messageData);

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

        // Populate sender info and replyTo message
        await message.populate('senderId', 'displayName photos');
        if (message.replyTo) {
          await message.populate({
            path: 'replyTo',
            select: 'content messageType audioUrl audioDuration senderId createdAt',
            populate: {
              path: 'senderId',
              select: 'displayName photos'
            }
          });
        }

        // Emit to sender (confirmation)
        socket.emit('message_sent', {
          ...message.toObject(),
          tempId: data.tempId, // For optimistic UI updates
        });

        // Emit to receiver (if online)
        io.to(receiverId.toString()).emit('new_message', {
          ...message.toObject(),
          tempId: data.tempId,
        });

      } catch (error) {
        console.error('Send message error:', error);
        socket.emit('message_error', { error: error.message });
      }
    });

    // Handle message delivery acknowledgment
    socket.on('ack_delivered', async (data) => {
      try {
        const { messageId, senderId } = data;
        
        await Message.findByIdAndUpdate(messageId, { status: 'delivered' });

        // Notify sender
        io.to(senderId.toString()).emit('message_delivered', {
          messageId,
          status: 'delivered',
        });
      } catch (error) {
        console.error('Ack delivered error:', error);
      }
    });

    // Handle typing indicator
    socket.on('typing', (data) => {
      const { receiverId, isTyping } = data;
      if (receiverId) {
        io.to(receiverId.toString()).emit('user_typing', {
          userId: socket.userId,
          isTyping,
        });
      }
    });

    // Handle recording indicator
    socket.on('recording', (data) => {
      const { receiverId, isRecording } = data;
      io.to(receiverId.toString()).emit('user_recording', {
        userId: socket.userId,
        isRecording,
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
            status: 'read',
            readAt: new Date(),
          }
        );

        // Notify sender that messages were read
        const messages = await Message.find({ conversationId }).limit(1);
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

    // Handle joining a chat (presence)
    socket.on('join_chat', (data) => {
      const { receiverId } = data;
      if (receiverId) {
        io.to(receiverId.toString()).emit('user_joined_chat', {
          userId: socket.userId,
        });
      }
    });

    // Handle leaving a chat (presence)
    socket.on('leave_chat', (data) => {
      const { receiverId } = data;
      if (receiverId) {
        io.to(receiverId.toString()).emit('user_left_chat', {
          userId: socket.userId,
        });
      }
    });

    // Handle presence acknowledgment
    socket.on('chat_presence_ack', (data) => {
      const { receiverId } = data;
      if (receiverId) {
        io.to(receiverId.toString()).emit('chat_presence_ack', {
          userId: socket.userId,
        });
      }
    });

    // Handle message pin/unpin
    socket.on('message_pin', async (data) => {
      try {
        const { messageId, conversationId, pin } = data;
        const userId = socket.userId;

        // If pinning, unpin any existing pinned message in this conversation
        if (pin) {
          await Message.updateMany(
            { conversationId, isPinned: true },
            { isPinned: false, pinnedAt: null, pinnedBy: null }
          );
        }

        // Update the message
        const message = await Message.findByIdAndUpdate(
          messageId,
          {
            isPinned: pin,
            pinnedAt: pin ? new Date() : null,
            pinnedBy: pin ? userId : null,
          },
          { new: true }
        );

        if (!message) {
          throw new Error('Message not found');
        }

        // Notify both users
        const otherUserId = message.senderId.toString() === userId.toString()
          ? message.receiverId
          : message.senderId;

        const pinData = {
          messageId,
          isPinned: pin,
          pinnedMessage: pin ? message : null,
        };

        socket.emit('message_pinned', pinData);
        io.to(otherUserId.toString()).emit('message_pinned', pinData);

      } catch (error) {
        console.error('Message pin error:', error);
        socket.emit('message_error', { error: error.message });
      }
    });

    // Handle message star/unstar
    socket.on('message_star', async (data) => {
      try {
        const { messageId, star } = data;
        const userId = socket.userId;

        const message = await Message.findById(messageId);
        
        if (!message) {
          throw new Error('Message not found');
        }

        // Update the message - add or remove user from starredBy array
        const updatedMessage = await Message.findByIdAndUpdate(
          messageId,
          star 
            ? { $addToSet: { starredBy: userId } }
            : { $pull: { starredBy: userId } },
          { new: true }
        );

        // Notify the user who starred/unstarred
        socket.emit('message_starred', {
          messageId,
          isStarred: star,
          starredBy: updatedMessage.starredBy,
        });

        // Notify the other user
        const otherUserId = message.senderId.toString() === userId.toString()
          ? message.receiverId
          : message.senderId;

        io.to(otherUserId.toString()).emit('message_starred', {
          messageId,
          isStarred: star, // Note: This tells them *someone* starred it, but we pass the array
          starredBy: updatedMessage.starredBy,
        });

      } catch (error) {
        console.error('Message star error:', error);
        socket.emit('message_error', { error: error.message });
      }
    });

    // Handle message delete
    socket.on('message_delete', async (data) => {
      try {
        const { messageId, deleteForEveryone } = data;
        const userId = socket.userId;

        const message = await Message.findById(messageId);
        
        if (!message) {
          throw new Error('Message not found');
        }

        // Check if user is the sender
        const isSender = message.senderId.toString() === userId.toString();

        if (!isSender && deleteForEveryone) {
          throw new Error('Can only delete own messages for everyone');
        }

        // Check time constraint for delete for everyone (1 hour)
        if (deleteForEveryone) {
          const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
          if (message.createdAt < oneHourAgo) {
            throw new Error('Can only delete for everyone within 1 hour');
          }
        }

        if (deleteForEveryone) {
          // Delete for everyone
          await Message.findByIdAndUpdate(messageId, {
            deletedForEveryone: true,
            deletedAt: new Date(),
          });

          // Notify both users
          const otherUserId = message.receiverId.toString();
          const deleteData = { messageId, deletedForEveryone: true };
          
          socket.emit('message_deleted', deleteData);
          io.to(otherUserId.toString()).emit('message_deleted', deleteData);
        } else {
          // Delete for me only
          await Message.findByIdAndUpdate(messageId, {
            $addToSet: { deletedFor: userId },
          });

          socket.emit('message_deleted', {
            messageId,
            deletedForEveryone: false,
          });
        }

      } catch (error) {
        console.error('Message delete error:', error);
        socket.emit('message_error', { error: error.message });
      }
    });

    // ============ WebRTC Signaling Handlers ============
    
    // Initiate a call
    socket.on('call_user', async (data) => {
      const { to, callType, from } = data;
      console.log(`Call from ${from} to ${to}, type: ${callType}`);
      
      // Notify the recipient
      io.to(to).emit('incoming_call', {
        from,
        callType,
        signal: data.signal,
      });
    });

    // Send WebRTC offer
    socket.on('webrtc_offer', (data) => {
      const { to, offer } = data;
      io.to(to).emit('webrtc_offer', {
        from: socket.userId.toString(),
        offer,
      });
    });

    // Send WebRTC answer
    socket.on('webrtc_answer', (data) => {
      const { to, answer } = data;
      io.to(to).emit('webrtc_answer', {
        from: socket.userId.toString(),
        answer,
      });
    });

    // Exchange ICE candidates
    socket.on('ice_candidate', (data) => {
      const { to, candidate } = data;
      io.to(to).emit('ice_candidate', {
        from: socket.userId.toString(),
        candidate,
      });
    });

    // Call accepted
    socket.on('call_accepted', (data) => {
      const { to } = data;
      io.to(to).emit('call_accepted', {
        from: socket.userId.toString(),
      });
    });

    // Call rejected
    socket.on('call_rejected', (data) => {
      const { to } = data;
      io.to(to).emit('call_rejected', {
        from: socket.userId.toString(),
      });
    });

    // Handle video toggle
    socket.on('video_toggle', (data) => {
      const { to, videoEnabled } = data;
      io.to(to).emit('video_toggle', {
        from: socket.userId.toString(),
        videoEnabled,
      });
    });

    // Call ended
    socket.on('end_call', (data) => {
      const { to } = data;
      io.to(to).emit('call_ended', {
        from: socket.userId.toString(),
      });
    });

    // Handle disconnect
    socket.on('disconnect', () => {
      console.log(`User disconnected: ${socket.userId}`);
    });
  });
};
