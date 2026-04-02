import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSwipeLimit } from '../hooks/useSwipeLimit';
import { useSubscription } from '../context/SubscriptionContext';
import { FREE_DAILY_SWIPE_LIMIT } from '../constants/subscription';

/**
 * Shows a subtle banner at the top of the Discover screen counting
 * down remaining free swipes.  Hidden for premium users.
 */
const SwipeLimitBanner = () => {
  const { isPremium } = useSubscription();
  const { swipesRemaining, isLimitReached } = useSwipeLimit();
  const { showPaywall } = useSubscription();

  // Hide entirely for premium users or when there are plenty of swipes left
  if (isPremium || swipesRemaining > 5) return null;

  if (isLimitReached) {
    return (
      <TouchableOpacity
        style={[styles.banner, styles.bannerEmpty]}
        onPress={() => showPaywall('swipes')}
        activeOpacity={0.85}
      >
        <Ionicons name="lock-closed" size={14} color="#fff" />
        <Text style={styles.emptyText}>No swipes left today — tap to upgrade</Text>
        <Ionicons name="chevron-forward" size={14} color="#fff" />
      </TouchableOpacity>
    );
  }

  // Low-swipe warning (1–5 remaining)
  const isLow = swipesRemaining <= 3;

  return (
    <TouchableOpacity
      style={[styles.banner, isLow ? styles.bannerLow : styles.bannerNormal]}
      onPress={() => showPaywall('swipes')}
      activeOpacity={0.85}
    >
      <Ionicons
        name={isLow ? 'warning-outline' : 'infinite-outline'}
        size={14}
        color={isLow ? '#fff' : '#B8860B'}
      />
      <Text style={[styles.text, isLow && styles.textLight]}>
        {swipesRemaining} of {FREE_DAILY_SWIPE_LIMIT} swipes left today
      </Text>
      <Text style={[styles.upgradeLink, isLow && styles.textLight]}>Upgrade</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 7,
    paddingHorizontal: 16,
    borderRadius: 20,
    marginHorizontal: 16,
    marginBottom: 8,
  },
  bannerNormal: {
    backgroundColor: '#FFF8E1',
    borderWidth: 1,
    borderColor: '#F5C842',
  },
  bannerLow: {
    backgroundColor: '#FF8C00',
  },
  bannerEmpty: {
    backgroundColor: '#C0392B',
  },
  text: {
    fontSize: 13,
    fontWeight: '600',
    color: '#7A5C00',
    flex: 1,
    textAlign: 'center',
  },
  textLight: {
    color: '#fff',
  },
  upgradeLink: {
    fontSize: 13,
    fontWeight: '700',
    color: '#B8860B',
    textDecorationLine: 'underline',
  },
  emptyText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#fff',
    flex: 1,
    textAlign: 'center',
  },
});

export default SwipeLimitBanner;
