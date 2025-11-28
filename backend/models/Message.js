const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  conversationId: {
    type: String,
    required: true,
    index: true,
  },
  senderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  receiverId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  content: {
    type: String,
    required: function() {
      return this.messageType === 'text';
    },
  },
  messageType: {
    type: String,
    enum: ['text', 'audio', 'image'],
    default: 'text',
  },
  audioUrl: {
    type: String,
  },
  audioDuration: {
    type: Number, // in seconds
  },
  // Reply functionality
  replyTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Message',
  },
  // Pin functionality
  isPinned: {
    type: Boolean,
    default: false,
  },
  pinnedAt: {
    type: Date,
  },
  pinnedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  // Star functionality
  starredBy: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  }],
  // Delete functionality
  deletedFor: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  }],
  deletedForEveryone: {
    type: Boolean,
    default: false,
  },
  deletedAt: {
    type: Date,
  },
  read: {
    type: Boolean,
    default: false,
  },
  status: {
    type: String,
    enum: ['sent', 'delivered', 'read'],
    default: 'sent',
  },
  readAt: {
    type: Date,
  },
}, {
  timestamps: true,
});

// Index for efficient queries
messageSchema.index({ conversationId: 1, createdAt: -1 });
messageSchema.index({ receiverId: 1, read: 1 });

module.exports = mongoose.model('Message', messageSchema);
