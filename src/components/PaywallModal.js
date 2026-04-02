import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Modal,
  Pressable,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSubscription } from '../context/SubscriptionContext';
import { SUBSCRIPTION_TIERS, PRODUCT_IDS } from '../constants/subscription';

// ─── Copy per trigger ─────────────────────────────────────────────────────────

const TRIGGER_CONTENT = {
  swipes: {
    icon: 'infinite-outline',
    title: "You're out of swipes",
    subtitle: "You've used all 10 free swipes today. Upgrade to Gold for unlimited swipes.",
    cta: 'Get Unlimited Swipes',
  },
  likes: {
    icon: 'heart-outline',
    title: 'See who likes you',
    subtitle: 'Upgrade to Gold to see exactly who wants to match with you.',
    cta: 'Unlock Likes',
  },
  top_picks: {
    icon: 'flash-outline',
    title: 'Unlock Top Picks',
    subtitle: 'Your handpicked daily matches are waiting. Upgrade to Gold to see them.',
    cta: 'See My Top Picks',
  },
  default: {
    icon: 'diamond-outline',
    title: 'Upgrade to Premium',
    subtitle: 'Unlock all features and find your perfect match faster.',
    cta: 'View Plans',
  },
};

// ─── Component ────────────────────────────────────────────────────────────────

const PaywallModal = ({ navigation }) => {
  const { paywallVisible, paywallTrigger, hidePaywall, purchase, purchasing } = useSubscription();
  const slideAnim = useRef(new Animated.Value(300)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const content = TRIGGER_CONTENT[paywallTrigger] || TRIGGER_CONTENT.default;

  useEffect(() => {
    if (paywallVisible) {
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
        Animated.spring(slideAnim, { toValue: 0, tension: 65, friction: 11, useNativeDriver: true }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 0, duration: 150, useNativeDriver: true }),
        Animated.timing(slideAnim, { toValue: 300, duration: 200, useNativeDriver: true }),
      ]).start();
    }
  }, [paywallVisible]);

  const handleGetGold = () => {
    hidePaywall();
    // Navigate to the Premium screen so the user can pick monthly vs yearly
    if (navigation) {
      navigation.navigate('Premium', { isTab: true });
    }
  };

  const handleViewAllPlans = () => {
    hidePaywall();
    if (navigation) {
      navigation.navigate('Premium', { isTab: true });
    }
  };

  return (
    <Modal
      visible={paywallVisible}
      transparent
      animationType="none"
      onRequestClose={hidePaywall}
    >
      <Animated.View style={[styles.overlay, { opacity: fadeAnim }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={hidePaywall} />

        <Animated.View
          style={[styles.sheet, { transform: [{ translateY: slideAnim }] }]}
        >
          {/* Handle bar */}
          <View style={styles.handle} />

          {/* Icon badge */}
          <View style={styles.iconBadge}>
            <LinearGradient
              colors={['#F5C842', '#B8860B']}
              style={styles.iconGradient}
            >
              <Ionicons name={content.icon} size={28} color="#fff" />
            </LinearGradient>
          </View>

          <Text style={styles.title}>{content.title}</Text>
          <Text style={styles.subtitle}>{content.subtitle}</Text>

          {/* Quick feature pills */}
          <View style={styles.pills}>
            {['Unlimited Swipes', 'See Likes', 'Top Picks', '5 SuperLikes'].map((f) => (
              <View key={f} style={styles.pill}>
                <Ionicons name="checkmark-circle" size={14} color="#B8860B" />
                <Text style={styles.pillText}>{f}</Text>
              </View>
            ))}
          </View>

          {/* Primary CTA */}
          <TouchableOpacity
            style={styles.primaryBtn}
            onPress={handleGetGold}
            disabled={purchasing}
            activeOpacity={0.85}
          >
            <LinearGradient
              colors={['#F5C842', '#B8860B']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.primaryBtnGradient}
            >
              {purchasing ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Text style={styles.primaryBtnText}>{content.cta}</Text>
                  <Text style={styles.primaryBtnSub}>from $9.99 / month</Text>
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>

          {/* Secondary link */}
          <TouchableOpacity onPress={handleViewAllPlans} style={styles.secondaryBtn}>
            <Text style={styles.secondaryBtnText}>See all plans →</Text>
          </TouchableOpacity>

          <View style={styles.legalRow}>
            <Text style={styles.legalText}>
              Recurring billing. Cancel anytime in{' '}
              {Platform.OS === 'ios' ? 'App Store Settings' : 'Google Play'}.
            </Text>
          </View>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 24,
    paddingBottom: 40,
    paddingTop: 12,
    alignItems: 'center',
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#E0E0E0',
    marginBottom: 24,
  },
  iconBadge: {
    marginBottom: 16,
  },
  iconGradient: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: '#111',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 15,
    color: '#666',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 20,
    paddingHorizontal: 8,
  },
  pills: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 24,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF8E1',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    gap: 4,
  },
  pillText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#7A5C00',
  },
  primaryBtn: {
    width: '100%',
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 12,
    shadowColor: '#B8860B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 5,
  },
  primaryBtnGradient: {
    paddingVertical: 18,
    alignItems: 'center',
  },
  primaryBtnText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#fff',
  },
  primaryBtnSub: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.85)',
    marginTop: 2,
  },
  secondaryBtn: {
    paddingVertical: 10,
  },
  secondaryBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#B8860B',
  },
  legalRow: {
    marginTop: 12,
    paddingHorizontal: 16,
  },
  legalText: {
    fontSize: 11,
    color: '#AAA',
    textAlign: 'center',
    lineHeight: 16,
  },
});

export default PaywallModal;
