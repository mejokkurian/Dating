const express = require('express');
const router = express.Router();
const {
  updateLocation,
  getNearbyUsers,
  toggleConnectNow,
  updateLocationPrivacy,
  sendQuickHello
} = require('../controllers/locationController');
const { protect } = require('../middleware/authMiddleware');

router.post('/update', protect, updateLocation);
router.get('/nearby', protect, getNearbyUsers);
router.put('/connect-now', protect, toggleConnectNow);
router.put('/privacy', protect, updateLocationPrivacy);
router.post('/quick-hello', protect, sendQuickHello);

module.exports = router;

