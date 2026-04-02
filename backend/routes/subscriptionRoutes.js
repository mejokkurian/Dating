const express = require('express');
const router = express.Router();
const {
  verifyPurchase,
  getStatus,
  restorePurchases,
  cancelSubscription,
} = require('../controllers/subscriptionController');
const { protect } = require('../middleware/authMiddleware');

router.get('/status', protect, getStatus);
router.post('/verify-purchase', protect, verifyPurchase);
router.post('/restore', protect, restorePurchases);
router.post('/cancel', protect, cancelSubscription);

module.exports = router;
