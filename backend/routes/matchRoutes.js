const express = require('express');
const router = express.Router();
const { getMatches, recordInteraction } = require('../controllers/matchController');
const { protect } = require('../middleware/authMiddleware');

router.get('/', protect, getMatches);
router.post('/interaction', protect, recordInteraction);

module.exports = router;
