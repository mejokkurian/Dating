const express = require('express');
const router = express.Router();
const { getMatches, getMyMatches, recordInteraction } = require('../controllers/matchController');
const { protect } = require('../middleware/authMiddleware');

router.get('/', protect, getMatches);
router.get('/my-matches', protect, getMyMatches);
router.post('/interaction', protect, recordInteraction);

module.exports = router;
