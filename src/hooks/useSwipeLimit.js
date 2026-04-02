import { useState, useCallback, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { FREE_DAILY_SWIPE_LIMIT } from '../constants/subscription';
import { useSubscription } from '../context/SubscriptionContext';

const STORAGE_KEY = '@emper_daily_swipes';

const todayUTC = () => new Date().toISOString().split('T')[0]; // YYYY-MM-DD

/**
 * Tracks daily swipe usage client-side.
 * The backend is the authoritative enforcer; this hook provides instant
 * UI feedback (banner countdown, paywall pre-check) without a round-trip.
 */
export const useSwipeLimit = () => {
  const { isPremium } = useSubscription();
  const [swipesUsed, setSwipesUsed] = useState(0);
  const [loadedDate, setLoadedDate] = useState(null);

  // ── Load persisted count ──────────────────────────────────────────────────
  useEffect(() => {
    const load = async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (!raw) return;
        const { date, count } = JSON.parse(raw);
        const today = todayUTC();
        if (date === today) {
          setSwipesUsed(count);
          setLoadedDate(date);
        } else {
          // New day — reset
          await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ date: today, count: 0 }));
          setSwipesUsed(0);
          setLoadedDate(today);
        }
      } catch {
        // Non-critical — fall through to 0
      }
    };
    load();
  }, []);

  // ── Increment ─────────────────────────────────────────────────────────────
  const incrementSwipeCount = useCallback(async () => {
    if (isPremium) return; // Don't track premium users
    const today = todayUTC();
    const newCount = loadedDate === today ? swipesUsed + 1 : 1;
    setSwipesUsed(newCount);
    setLoadedDate(today);
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ date: today, count: newCount }));
    } catch {
      // Non-critical
    }
  }, [isPremium, swipesUsed, loadedDate]);

  // ── Derived values ────────────────────────────────────────────────────────
  const swipesRemaining = isPremium
    ? Infinity
    : Math.max(0, FREE_DAILY_SWIPE_LIMIT - swipesUsed);

  const isLimitReached = !isPremium && swipesRemaining === 0;

  return {
    swipesUsed,
    swipesRemaining,
    isLimitReached,
    incrementSwipeCount,
    dailyLimit: FREE_DAILY_SWIPE_LIMIT,
  };
};
