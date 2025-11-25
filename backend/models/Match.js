const mongoose = require('mongoose');

const matchSchema = new mongoose.Schema({
  user1Id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  user2Id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  status: {
    type: String,
    enum: ['active', 'unmatched'],
    default: 'active',
  },
  lastMessageAt: {
    type: Date,
  },
}, {
  timestamps: true,
});

// Ensure unique matches (prevent duplicates)
matchSchema.index({ user1Id: 1, user2Id: 1 }, { unique: true });

// Helper method to get conversation ID
matchSchema.methods.getConversationId = function() {
  const ids = [this.user1Id.toString(), this.user2Id.toString()].sort();
  return `${ids[0]}_${ids[1]}`;
};

// Static method to create or find match
matchSchema.statics.findOrCreateMatch = async function(userId1, userId2) {
  const ids = [userId1, userId2].sort();
  
  let match = await this.findOne({
    user1Id: ids[0],
    user2Id: ids[1],
  });

  if (!match) {
    match = await this.create({
      user1Id: ids[0],
      user2Id: ids[1],
    });
  }

  return match;
};

module.exports = mongoose.model('Match', matchSchema);
