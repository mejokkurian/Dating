const Message = require('../models/Message');
const Match = require('../models/Match');

// Helper to generate conversation ID
const getConversationId = (userId1, userId2) => {
  const ids = [userId1.toString(), userId2.toString()].sort();
  return `${ids[0]}_${ids[1]}`;
};

// @desc    Get all conversations for a user
// @route   GET /api/chat/conversations
// @access  Private
exports.getConversations = async (req, res) => {
  try {
    const userId = req.user._id;

    // Find all matches for this user
    const matches = await Match.find({
      $or: [{ user1Id: userId }, { user2Id: userId }],
      status: 'active',
    })
      .populate('user1Id', 'displayName photos')
      .populate('user2Id', 'displayName photos')
      .sort({ lastMessageAt: -1 });

    // Get last message and unread count for each conversation
    const conversations = await Promise.all(
      matches.map(async (match) => {
        const otherUser =
          match.user1Id._id.toString() === userId.toString()
            ? match.user2Id
            : match.user1Id;

        const conversationId = match.getConversationId();

        // Get last message
        const lastMessage = await Message.findOne({ conversationId })
          .sort({ createdAt: -1 })
          .limit(1);

        // Get unread count
        const unreadCount = await Message.countDocuments({
          conversationId,
          receiverId: userId,
          read: false,
        });

        return {
          conversationId,
          otherUser: {
            _id: otherUser._id,
            displayName: otherUser.displayName,
            photos: otherUser.photos,
          },
          lastMessage: lastMessage
            ? {
                content: lastMessage.content,
                createdAt: lastMessage.createdAt,
                senderId: lastMessage.senderId,
              }
            : null,
          unreadCount,
          lastMessageAt: match.lastMessageAt || match.createdAt,
        };
      })
    );

    res.json(conversations);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get messages with a specific user
// @route   GET /api/chat/messages/:userId
// @access  Private
exports.getMessages = async (req, res) => {
  try {
    const currentUserId = req.user._id;
    const otherUserId = req.params.userId;
    const { limit = 50, before } = req.query;

    const conversationId = getConversationId(currentUserId, otherUserId);

    const query = { conversationId };
    if (before) {
      query.createdAt = { $lt: new Date(before) };
    }

    const messages = await Message.find(query)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .populate('senderId', 'displayName photos');

    res.json(messages.reverse());
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Mark messages as read
// @route   POST /api/chat/mark-read/:conversationId
// @access  Private
exports.markAsRead = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const userId = req.user._id;

    await Message.updateMany(
      {
        conversationId,
        receiverId: userId,
        read: false,
      },
      {
        read: true,
        readAt: new Date(),
      }
    );

    res.json({ message: 'Messages marked as read' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
