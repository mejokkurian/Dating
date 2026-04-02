const https = require('https');
const User = require('../models/User');

// ─── Helpers ──────────────────────────────────────────────────────────────────

const TODAY_UTC = () => new Date().toISOString().split('T')[0]; // YYYY-MM-DD

// Derive tier from a product ID string
const tierFromProductId = (productId) => {
  if (!productId) return 'free';
  if (productId.includes('platinum')) return 'platinum';
  if (productId.includes('gold')) return 'gold';
  return 'free';
};

// Derive plan period from product ID
const periodFromProductId = (productId) => {
  if (!productId) return null;
  if (productId.includes('yearly')) return 'yearly';
  return 'monthly';
};

// Validate receipt with Apple's verifyReceipt endpoint
const verifyAppleReceipt = (receiptData) =>
  new Promise((resolve, reject) => {
    const body = JSON.stringify({
      'receipt-data': receiptData,
      password: process.env.APPLE_IAP_SHARED_SECRET || '',
      'exclude-old-transactions': true,
    });

    // Try production first, fall back to sandbox on 21007
    const postToApple = (env) =>
      new Promise((res, rej) => {
        const host =
          env === 'production'
            ? 'buy.itunes.apple.com'
            : 'sandbox.itunes.apple.com';
        const req = https.request(
          { hostname: host, path: '/verifyReceipt', method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) } },
          (r) => {
            let data = '';
            r.on('data', (c) => { data += c; });
            r.on('end', () => {
              try { res(JSON.parse(data)); }
              catch (e) { rej(e); }
            });
          }
        );
        req.on('error', rej);
        req.write(body);
        req.end();
      });

    postToApple('production')
      .then((result) => {
        // 21007 = receipt is from sandbox — retry against sandbox
        if (result.status === 21007) return postToApple('sandbox');
        return result;
      })
      .then(resolve)
      .catch(reject);
  });

// ─── Controllers ─────────────────────────────────────────────────────────────

// @desc    Verify a completed IAP purchase and activate subscription
// @route   POST /api/subscription/verify-purchase
// @access  Private
exports.verifyPurchase = async (req, res) => {
  try {
    const { productId, transactionId, receipt, purchaseToken, platform } = req.body;
    const userId = req.user._id;

    if (!productId || !platform) {
      return res.status(400).json({ message: 'productId and platform are required' });
    }

    const tier = tierFromProductId(productId);
    const plan = periodFromProductId(productId);

    if (tier === 'free') {
      return res.status(400).json({ message: 'Invalid product ID' });
    }

    // ── iOS receipt validation ──────────────────────────────────────────────
    if (platform === 'ios') {
      if (!receipt) return res.status(400).json({ message: 'receipt required for iOS' });

      // Only do full validation when the Apple shared secret is configured.
      // In development the secret may be absent — skip deep validation.
      if (process.env.APPLE_IAP_SHARED_SECRET) {
        const appleResult = await verifyAppleReceipt(receipt);
        if (appleResult.status !== 0) {
          console.error('Apple receipt validation failed, status:', appleResult.status);
          return res.status(400).json({ message: 'Receipt validation failed', appleStatus: appleResult.status });
        }

        // Verify the transactionId is present in the latest_receipt_info
        const latestReceipts = appleResult.latest_receipt_info || [];
        const matchingReceipt = latestReceipts.find(
          (r) => r.product_id === productId && r.transaction_id === transactionId
        );
        if (!matchingReceipt) {
          return res.status(400).json({ message: 'Transaction not found in receipt' });
        }

        // Expiry from Apple receipt
        const expiryMs = parseInt(matchingReceipt.expires_date_ms, 10);
        const expiryDate = isNaN(expiryMs) ? null : new Date(expiryMs);

        await User.findByIdAndUpdate(userId, {
          isPremium: true,
          subscriptionTier: tier,
          subscriptionPlan: plan,
          subscriptionProductId: productId,
          subscriptionPurchaseDate: new Date(),
          subscriptionExpiryDate: expiryDate,
        });
      } else {
        // Dev / CI — trust the client, set a 30-day expiry
        const expiryDate = new Date();
        expiryDate.setDate(expiryDate.getDate() + (plan === 'yearly' ? 365 : 30));

        await User.findByIdAndUpdate(userId, {
          isPremium: true,
          subscriptionTier: tier,
          subscriptionPlan: plan,
          subscriptionProductId: productId,
          subscriptionPurchaseDate: new Date(),
          subscriptionExpiryDate: expiryDate,
        });
      }
    }

    // ── Android purchase token validation ───────────────────────────────────
    // Full Google Play Developer API validation requires a service account key.
    // When GOOGLE_SERVICE_ACCOUNT_KEY is not set, we trust the client for now.
    if (platform === 'android') {
      if (!purchaseToken) return res.status(400).json({ message: 'purchaseToken required for Android' });

      const expiryDate = new Date();
      expiryDate.setDate(expiryDate.getDate() + (plan === 'yearly' ? 365 : 30));

      await User.findByIdAndUpdate(userId, {
        isPremium: true,
        subscriptionTier: tier,
        subscriptionPlan: plan,
        subscriptionProductId: productId,
        subscriptionPurchaseDate: new Date(),
        subscriptionExpiryDate: expiryDate,
      });
    }

    const updatedUser = await User.findById(userId).select(
      'isPremium subscriptionTier subscriptionPlan subscriptionExpiryDate subscriptionPurchaseDate subscriptionProductId'
    );

    res.json({ message: 'Subscription activated', subscription: updatedUser });
  } catch (error) {
    console.error('verifyPurchase error:', error);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get current subscription status
// @route   GET /api/subscription/status
// @access  Private
exports.getStatus = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select(
      'isPremium subscriptionTier subscriptionPlan subscriptionExpiryDate subscriptionPurchaseDate subscriptionProductId dailySwipeCount dailySwipeDate'
    );

    // Auto-expire if past the expiry date
    if (user.isPremium && user.subscriptionExpiryDate && new Date() > user.subscriptionExpiryDate) {
      await User.findByIdAndUpdate(req.user._id, {
        isPremium: false,
        subscriptionTier: 'free',
        subscriptionPlan: null,
        subscriptionProductId: null,
      });
      user.isPremium = false;
      user.subscriptionTier = 'free';
      user.subscriptionPlan = null;
    }

    // Daily swipe remaining for free users
    const today = TODAY_UTC();
    let swipesUsedToday = 0;
    if (!user.isPremium) {
      swipesUsedToday = user.dailySwipeDate === today ? (user.dailySwipeCount || 0) : 0;
    }

    res.json({
      isPremium: user.isPremium,
      tier: user.subscriptionTier || 'free',
      plan: user.subscriptionPlan,
      productId: user.subscriptionProductId,
      expiryDate: user.subscriptionExpiryDate,
      purchaseDate: user.subscriptionPurchaseDate,
      swipesUsedToday,
      dailySwipeLimit: user.isPremium ? null : 10,
    });
  } catch (error) {
    console.error('getStatus error:', error);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Restore purchases (called when user reinstalls or logs in on new device)
// @route   POST /api/subscription/restore
// @access  Private
exports.restorePurchases = async (req, res) => {
  try {
    const { receipt, platform } = req.body;
    const userId = req.user._id;

    if (!platform) return res.status(400).json({ message: 'platform required' });

    if (platform === 'ios' && receipt && process.env.APPLE_IAP_SHARED_SECRET) {
      const appleResult = await verifyAppleReceipt(receipt);

      if (appleResult.status !== 0) {
        return res.status(400).json({ message: 'Receipt validation failed', appleStatus: appleResult.status });
      }

      const latestReceipts = appleResult.latest_receipt_info || [];
      if (latestReceipts.length === 0) {
        return res.json({ restored: false, message: 'No active subscriptions found' });
      }

      // Find the most recent non-expired subscription
      const now = Date.now();
      const active = latestReceipts
        .filter((r) => parseInt(r.expires_date_ms, 10) > now)
        .sort((a, b) => parseInt(b.expires_date_ms, 10) - parseInt(a.expires_date_ms, 10));

      if (active.length === 0) {
        return res.json({ restored: false, message: 'No active subscriptions found' });
      }

      const best = active[0];
      const tier = tierFromProductId(best.product_id);
      const plan = periodFromProductId(best.product_id);
      const expiryDate = new Date(parseInt(best.expires_date_ms, 10));

      await User.findByIdAndUpdate(userId, {
        isPremium: true,
        subscriptionTier: tier,
        subscriptionPlan: plan,
        subscriptionProductId: best.product_id,
        subscriptionPurchaseDate: new Date(),
        subscriptionExpiryDate: expiryDate,
      });

      const updatedUser = await User.findById(userId).select(
        'isPremium subscriptionTier subscriptionPlan subscriptionExpiryDate subscriptionProductId'
      );
      return res.json({ restored: true, subscription: updatedUser });
    }

    // Android restore — client sends the available purchases, we trust the most recent active one
    const { purchases } = req.body; // [{ productId, purchaseToken, ... }]
    if (platform === 'android' && purchases && purchases.length > 0) {
      const latest = purchases[0]; // client should send sorted by date desc
      const tier = tierFromProductId(latest.productId);
      const plan = periodFromProductId(latest.productId);
      const expiryDate = new Date();
      expiryDate.setDate(expiryDate.getDate() + (plan === 'yearly' ? 365 : 30));

      await User.findByIdAndUpdate(userId, {
        isPremium: true,
        subscriptionTier: tier,
        subscriptionPlan: plan,
        subscriptionProductId: latest.productId,
        subscriptionPurchaseDate: new Date(),
        subscriptionExpiryDate: expiryDate,
      });

      const updatedUser = await User.findById(userId).select(
        'isPremium subscriptionTier subscriptionPlan subscriptionExpiryDate subscriptionProductId'
      );
      return res.json({ restored: true, subscription: updatedUser });
    }

    res.json({ restored: false, message: 'No purchases to restore' });
  } catch (error) {
    console.error('restorePurchases error:', error);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Cancel/downgrade subscription (admin or webhook use)
// @route   POST /api/subscription/cancel
// @access  Private
exports.cancelSubscription = async (req, res) => {
  try {
    await User.findByIdAndUpdate(req.user._id, {
      isPremium: false,
      subscriptionTier: 'free',
      subscriptionPlan: null,
      subscriptionProductId: null,
      subscriptionExpiryDate: null,
    });
    res.json({ message: 'Subscription cancelled' });
  } catch (error) {
    console.error('cancelSubscription error:', error);
    res.status(500).json({ message: error.message });
  }
};
