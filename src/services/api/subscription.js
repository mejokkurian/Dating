import apiClient from './config';

// GET /api/subscription/status
export const getSubscriptionStatus = async () => {
  const { data } = await apiClient.get('/subscription/status');
  return data;
};

// POST /api/subscription/verify-purchase
// payload: { productId, transactionId, receipt (iOS) | purchaseToken (Android), platform }
export const verifyPurchase = async (payload) => {
  const { data } = await apiClient.post('/subscription/verify-purchase', payload);
  return data;
};

// POST /api/subscription/restore
// iOS:     { platform: 'ios', receipt }
// Android: { platform: 'android', purchases: [...] }
export const restorePurchases = async (payload) => {
  const { data } = await apiClient.post('/subscription/restore', payload);
  return data;
};

// POST /api/subscription/cancel
export const cancelSubscription = async () => {
  const { data } = await apiClient.post('/subscription/cancel');
  return data;
};
