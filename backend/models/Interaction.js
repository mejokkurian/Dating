const mongoose = require('mongoose');

const interactionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  targetId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  action: {
    type: String,
    enum: ['LIKE', 'PASS', 'SUPERLIKE'],
    required: true,
  },
}, {
  timestamps: true,
});

// Compound index for efficient lookups
interactionSchema.index({ userId: 1, targetId: 1 });

module.exports = mongoose.model('Interaction', interactionSchema);
