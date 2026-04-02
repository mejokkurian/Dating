import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
  useCallback,
} from 'react';
import { Platform, Alert } from 'react-native';
import {
  initConnection,
  endConnection,
  getSubscriptions,
  requestSubscription,
  getAvailablePurchases,
  purchaseUpdatedListener,
  purchaseErrorListener,
  finishTransaction,
} from 'react-native-iap';
import {
  getSubscriptionStatus,
  verifyPurchase,
  restorePurchases as restoreAPI,
} from '../services/api/subscription';
import {
  ALL_PRODUCT_IDS,
  SUBSCRIPTION_TIERS,
  tierFromProductId,
} from '../constants/subscription';

// ─── Context ──────────────────────────────────────────────────────────────────

const SubscriptionContext = createContext({});

export const useSubscription = () => {
  const ctx = useContext(SubscriptionContext);
  if (!ctx) throw new Error('useSubscription must be used inside SubscriptionProvider');
  return ctx;
};

// ─── Provider ─────────────────────────────────────────────────────────────────

export const SubscriptionProvider = ({ children }) => {
  const [tier, setTier] = useState(SUBSCRIPTION_TIERS.FREE);
  const [isPremium, setIsPremium] = useState(false);
  const [expiryDate, setExpiryDate] = useState(null);
  const [products, setProducts] = useState([]);          // IAP products from store
  const [purchasing, setPurchasing] = useState(false);   // loading state
  const [restoring, setRestoring] = useState(false);
  const [statusLoading, setStatusLoading] = useState(true);
  const [iapConnected, setIapConnected] = useState(false);

  // Paywall visibility — trigger: 'swipes' | 'likes' | 'top_picks' | null
  const [paywallVisible, setPaywallVisible] = useState(false);
  const [paywallTrigger, setPaywallTrigger] = useState(null);

  const purchaseUpdateSub = useRef(null);
  const purchaseErrorSub = useRef(null);

  // ── Helpers ────────────────────────────────────────────────────────────────

  const applyStatus = (status) => {
    setIsPremium(status.isPremium || false);
    setTier(status.tier || SUBSCRIPTION_TIERS.FREE);
    setExpiryDate(status.expiryDate ? new Date(status.expiryDate) : null);
  };

  // ── Load status from backend ───────────────────────────────────────────────

  const refreshStatus = useCallback(async () => {
    try {
      const status = await getSubscriptionStatus();
      applyStatus(status);
    } catch (err) {
      if (__DEV__) console.error('[Subscription] refreshStatus error:', err);
    } finally {
      setStatusLoading(false);
    }
  }, []);

  // ── IAP connection + product fetch ────────────────────────────────────────

  useEffect(() => {
    let mounted = true;

    const setup = async () => {
      try {
        await initConnection();
        if (!mounted) return;
        setIapConnected(true);

        const subs = await getSubscriptions({ skus: ALL_PRODUCT_IDS });
        if (mounted) setProducts(subs);
      } catch (err) {
        if (__DEV__) console.error('[Subscription] IAP init error:', err);
      }
    };

    setup();

    return () => {
      mounted = false;
      endConnection();
    };
  }, []);

  // ── Purchase listeners ────────────────────────────────────────────────────

  useEffect(() => {
    purchaseUpdateSub.current = purchaseUpdatedListener(async (purchase) => {
      if (__DEV__) console.log('[Subscription] purchaseUpdated:', purchase.productId);

      const receipt = purchase.transactionReceipt;
      if (!receipt) return;

      try {
        const payload = {
          productId: purchase.productId,
          transactionId: purchase.transactionId,
          platform: Platform.OS,
          ...(Platform.OS === 'ios'
            ? { receipt }
            : { purchaseToken: purchase.purchaseToken }),
        };

        const result = await verifyPurchase(payload);
        applyStatus(result.subscription);

        // Acknowledge the transaction so the store doesn't refund it
        await finishTransaction({ purchase, isConsumable: false });

        Alert.alert(
          'Welcome to ' + (tierFromProductId(purchase.productId) === SUBSCRIPTION_TIERS.PLATINUM ? 'Platinum' : 'Gold') + '!',
          'Your subscription is now active. Enjoy unlimited access.'
        );
      } catch (err) {
        if (__DEV__) console.error('[Subscription] verifyPurchase error:', err);
        Alert.alert('Purchase Error', 'Could not activate subscription. Please contact support.');
      } finally {
        setPurchasing(false);
      }
    });

    purchaseErrorSub.current = purchaseErrorListener((err) => {
      if (__DEV__) console.error('[Subscription] purchaseError:', err);
      setPurchasing(false);
      // Don't show alert for user-cancelled (code E_USER_CANCELLED)
      if (err.code !== 'E_USER_CANCELLED') {
        Alert.alert('Purchase Failed', err.message || 'Something went wrong. Please try again.');
      }
    });

    return () => {
      purchaseUpdateSub.current?.remove();
      purchaseErrorSub.current?.remove();
    };
  }, []);

  // ── Load initial status ───────────────────────────────────────────────────

  useEffect(() => {
    refreshStatus();
  }, [refreshStatus]);

  // ── Buy ───────────────────────────────────────────────────────────────────

  const purchase = useCallback(async (productId) => {
    if (!iapConnected) {
      Alert.alert('Store Unavailable', 'Could not connect to the App Store. Please try again.');
      return;
    }
    try {
      setPurchasing(true);
      await requestSubscription({ sku: productId });
      // Result handled in purchaseUpdatedListener above
    } catch (err) {
      if (__DEV__) console.error('[Subscription] requestSubscription error:', err);
      setPurchasing(false);
      if (err.code !== 'E_USER_CANCELLED') {
        Alert.alert('Purchase Failed', err.message || 'Please try again.');
      }
    }
  }, [iapConnected]);

  // ── Restore ───────────────────────────────────────────────────────────────

  const restorePurchases = useCallback(async () => {
    if (!iapConnected) {
      Alert.alert('Store Unavailable', 'Could not connect to the store. Please try again.');
      return;
    }
    try {
      setRestoring(true);
      const available = await getAvailablePurchases();

      if (!available || available.length === 0) {
        Alert.alert('No Purchases Found', 'No previous purchases were found for this account.');
        return;
      }

      // Send to backend to validate and activate
      const payload =
        Platform.OS === 'ios'
          ? { platform: 'ios', receipt: available[0].transactionReceipt }
          : {
              platform: 'android',
              purchases: available.map((p) => ({
                productId: p.productId,
                purchaseToken: p.purchaseToken,
              })),
            };

      const result = await restoreAPI(payload);
      if (result.restored) {
        applyStatus(result.subscription);
        Alert.alert('Restored!', 'Your subscription has been restored.');
      } else {
        Alert.alert('No Active Subscription', 'We could not find an active subscription to restore.');
      }
    } catch (err) {
      if (__DEV__) console.error('[Subscription] restore error:', err);
      Alert.alert('Restore Failed', 'Could not restore purchases. Please try again.');
    } finally {
      setRestoring(false);
    }
  }, [iapConnected]);

  // ── Paywall helpers ───────────────────────────────────────────────────────

  const showPaywall = useCallback((trigger = null) => {
    setPaywallTrigger(trigger);
    setPaywallVisible(true);
  }, []);

  const hidePaywall = useCallback(() => {
    setPaywallVisible(false);
    setPaywallTrigger(null);
  }, []);

  // ── Value ─────────────────────────────────────────────────────────────────

  return (
    <SubscriptionContext.Provider
      value={{
        // State
        tier,
        isPremium,
        expiryDate,
        products,
        purchasing,
        restoring,
        statusLoading,
        // Actions
        purchase,
        restorePurchases,
        refreshStatus,
        // Paywall
        paywallVisible,
        paywallTrigger,
        showPaywall,
        hidePaywall,
      }}
    >
      {children}
    </SubscriptionContext.Provider>
  );
};
