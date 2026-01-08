const express = require('express');
const router = express.Router();
const { getMatches, getMyMatches, recordInteraction, respondToLike, getTopPicks } = require('../controllers/matchController');
const { protect } = require('../middleware/authMiddleware');

router.get('/', protect, getMatches);
router.get('/top-picks', protect, getTopPicks);
router.get('/my-matches', protect, getMyMatches);
router.post('/interaction', protect, recordInteraction);
router.post('/:matchId/respond', protect, respondToLike);

module.exports = router;
