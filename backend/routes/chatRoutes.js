const express = require('express');
const router = express.Router();
const { getConversations, getMessages, markAsRead, getTurnCredentials } = require('../controllers/chatController');
const { protect } = require('../middleware/authMiddleware');

router.get('/conversations', protect, getConversations);
router.get('/messages/:userId', protect, getMessages);
router.post('/mark-read/:conversationId', protect, markAsRead);
router.get('/turn-credentials', protect, getTurnCredentials);

module.exports = router;
