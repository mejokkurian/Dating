import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSubscription } from '../../context/SubscriptionContext';
import { useAuth } from '../../context/AuthContext';
import {
  GOLD_FEATURES,
  PLATINUM_FEATURES,
  PRODUCT_IDS,
  SUBSCRIPTION_TIERS,
} from '../../constants/subscription';

// ─── Sub-components ────────────────────────────────────────────────────────────

const FeatureRow = ({ icon, label, desc }) => (
  <View style={styles.featureRow}>
    <View style={styles.featureIcon}>
      <Ionicons name={icon} size={20} color="#B8860B" />
    </View>
    <View style={styles.featureText}>
      <Text style={styles.featureLabel}>{label}</Text>
      {desc ? <Text style={styles.featureDesc}>{desc}</Text> : null}
    </View>
    <Ionicons name="checkmark-circle" size={18} color="#B8860B" />
  </View>
);

const PlanCard = ({ period, selected, onSelect, price, savings, billingPeriod }) => (
  <TouchableOpacity
    style={[styles.planCard, selected && styles.planCardSelected]}
    onPress={onSelect}
    activeOpacity={0.85}
  >
    {savings ? (
      <View style={styles.savingsBadge}>
        <Text style={styles.savingsBadgeText}>{savings}</Text>
      </View>
    ) : null}
    <Text style={[styles.planPeriod, selected && styles.planPeriodSelected]}>
      {period === 'yearly' ? 'Annual' : 'Monthly'}
    </Text>
    <Text style={[styles.planPrice, selected && styles.planPriceSelected]}>{price}</Text>
    <Text style={[styles.planBillingPeriod, selected && styles.planBillingPeriodSelected]}>
      {billingPeriod}
    </Text>
    {selected && (
      <View style={styles.planCheck}>
        <Ionicons name="checkmark-circle" size={20} color="#B8860B" />
      </View>
    )}
  </TouchableOpacity>
);

// ─── Main Screen ──────────────────────────────────────────────────────────────

const PremiumScreen = ({ route }) => {
  const { setOnboardingComplete } = useAuth();
  const {
    tier,
    isPremium,
    expiryDate,
    purchase,
    restorePurchases,
    purchasing,
    restoring,
    products,
  } = useSubscription();

  const isTab = route?.params?.isTab;

  // Default: show Gold tab, monthly period
  const [activeTier, setActiveTier] = useState(SUBSCRIPTION_TIERS.GOLD);
  const [activePeriod, setActivePeriod] = useState('monthly');

  // Resolve the right product ID for current selections
  const selectedProductId =
    activeTier === SUBSCRIPTION_TIERS.PLATINUM
      ? activePeriod === 'yearly'
        ? PRODUCT_IDS.PLATINUM_YEARLY
        : PRODUCT_IDS.PLATINUM_MONTHLY
      : activePeriod === 'yearly'
      ? PRODUCT_IDS.GOLD_YEARLY
      : PRODUCT_IDS.GOLD_MONTHLY;

  // Get store price if available (falls back to hardcoded)
  const storePrice = (productId) => {
    const p = products.find((p) => p.productId === productId);
    return p?.localizedPrice || null;
  };

  const handleSubscribe = async () => {
    await purchase(selectedProductId);
    if (!isTab) setOnboardingComplete(true);
  };

  const handleSkip = () => {
    setOnboardingComplete(true);
  };

  // ── Active subscription view ──────────────────────────────────────────────
  if (isPremium) {
    const tierLabel = tier === SUBSCRIPTION_TIERS.PLATINUM ? 'Platinum' : 'Gold';
    const formattedExpiry = expiryDate
      ? expiryDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
      : null;

    return (
      <SafeAreaView style={styles.container}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <LinearGradient colors={['#F5C842', '#B8860B']} style={styles.activeBadge}>
            <Ionicons name="diamond" size={36} color="#fff" />
          </LinearGradient>

          <Text style={styles.activeTitle}>You're on {tierLabel}!</Text>
          {formattedExpiry && (
            <Text style={styles.activeSubtitle}>Renews on {formattedExpiry}</Text>
          )}

          <View style={styles.activeFeatureList}>
            {(tier === SUBSCRIPTION_TIERS.PLATINUM ? PLATINUM_FEATURES : GOLD_FEATURES).map(
              (f, i) => <FeatureRow key={i} {...f} />
            )}
          </View>

          <TouchableOpacity
            style={styles.manageBtn}
            onPress={() =>
              Platform.OS === 'ios'
                ? require('react-native').Linking.openURL(
                    'https://apps.apple.com/account/subscriptions'
                  )
                : require('react-native').Linking.openURL(
                    'https://play.google.com/store/account/subscriptions'
                  )
            }
          >
            <Text style={styles.manageBtnText}>Manage Subscription</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ── Paywall / upsell view ─────────────────────────────────────────────────
  const features =
    activeTier === SUBSCRIPTION_TIERS.PLATINUM ? PLATINUM_FEATURES : GOLD_FEATURES;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <LinearGradient colors={['#F5C842', '#B8860B']} style={styles.headerBadge}>
            <Ionicons name="diamond" size={32} color="#fff" />
          </LinearGradient>
          <Text style={styles.title}>Unlock Premium</Text>
          <Text style={styles.subtitle}>Find your match faster with premium features</Text>
        </View>

        {/* Tier selector */}
        <View style={styles.tierSelector}>
          <TouchableOpacity
            style={[styles.tierTab, activeTier === SUBSCRIPTION_TIERS.GOLD && styles.tierTabActive]}
            onPress={() => setActiveTier(SUBSCRIPTION_TIERS.GOLD)}
          >
            <Text style={[styles.tierTabText, activeTier === SUBSCRIPTION_TIERS.GOLD && styles.tierTabTextActive]}>
              ✦ Gold
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tierTab, activeTier === SUBSCRIPTION_TIERS.PLATINUM && styles.tierTabActive]}
            onPress={() => setActiveTier(SUBSCRIPTION_TIERS.PLATINUM)}
          >
            <Text style={[styles.tierTabText, activeTier === SUBSCRIPTION_TIERS.PLATINUM && styles.tierTabTextActive]}>
              ◆ Platinum
            </Text>
          </TouchableOpacity>
        </View>

        {/* Billing period selector */}
        <View style={styles.periodRow}>
          <PlanCard
            period="monthly"
            selected={activePeriod === 'monthly'}
            onSelect={() => setActivePeriod('monthly')}
            price={
              storePrice(
                activeTier === SUBSCRIPTION_TIERS.PLATINUM
                  ? PRODUCT_IDS.PLATINUM_MONTHLY
                  : PRODUCT_IDS.GOLD_MONTHLY
              ) || (activeTier === SUBSCRIPTION_TIERS.PLATINUM ? '$19.99' : '$9.99')
            }
            billingPeriod="/ month"
            savings={null}
          />
          <PlanCard
            period="yearly"
            selected={activePeriod === 'yearly'}
            onSelect={() => setActivePeriod('yearly')}
            price={
              storePrice(
                activeTier === SUBSCRIPTION_TIERS.PLATINUM
                  ? PRODUCT_IDS.PLATINUM_YEARLY
                  : PRODUCT_IDS.GOLD_YEARLY
              ) || (activeTier === SUBSCRIPTION_TIERS.PLATINUM ? '$99.99' : '$59.99')
            }
            billingPeriod="/ year"
            savings={activeTier === SUBSCRIPTION_TIERS.PLATINUM ? 'Save 58%' : 'Save 50%'}
          />
        </View>

        {/* Features list */}
        <View style={styles.featureList}>
          {features.map((f, i) => (
            <FeatureRow key={i} {...f} />
          ))}
        </View>

        {/* Subscribe button */}
        <TouchableOpacity
          style={styles.subscribeBtn}
          onPress={handleSubscribe}
          disabled={purchasing}
          activeOpacity={0.85}
        >
          <LinearGradient
            colors={['#F5C842', '#B8860B']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.subscribeBtnGradient}
          >
            {purchasing ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <>
                <Text style={styles.subscribeBtnText}>
                  Get {activeTier === SUBSCRIPTION_TIERS.PLATINUM ? 'Platinum' : 'Gold'}
                </Text>
                <Text style={styles.subscribeBtnSub}>
                  Cancel anytime in{' '}
                  {Platform.OS === 'ios' ? 'App Store Settings' : 'Google Play'}
                </Text>
              </>
            )}
          </LinearGradient>
        </TouchableOpacity>

        {/* Restore */}
        <TouchableOpacity
          style={styles.restoreBtn}
          onPress={restorePurchases}
          disabled={restoring}
        >
          {restoring ? (
            <ActivityIndicator size="small" color="#B8860B" />
          ) : (
            <Text style={styles.restoreBtnText}>Restore Purchases</Text>
          )}
        </TouchableOpacity>

        {/* Skip (onboarding only) */}
        {!isTab && (
          <TouchableOpacity style={styles.skipBtn} onPress={handleSkip}>
            <Text style={styles.skipBtnText}>Maybe Later</Text>
          </TouchableOpacity>
        )}

        <Text style={styles.legal}>
          Subscription auto-renews unless cancelled at least 24 hours before the end of the current
          period. Payment will be charged to your{' '}
          {Platform.OS === 'ios' ? 'Apple ID' : 'Google Play'} account.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAFAFA' },
  content: { padding: 20, paddingBottom: 60 },

  // ── Header ──
  header: { alignItems: 'center', marginBottom: 28, marginTop: 8 },
  headerBadge: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: { fontSize: 28, fontWeight: '800', color: '#111', marginBottom: 6 },
  subtitle: { fontSize: 15, color: '#777', textAlign: 'center' },

  // ── Tier selector ──
  tierSelector: {
    flexDirection: 'row',
    backgroundColor: '#F0F0F0',
    borderRadius: 14,
    padding: 4,
    marginBottom: 16,
  },
  tierTab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 10,
  },
  tierTabActive: { backgroundColor: '#fff', shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 4, elevation: 2 },
  tierTabText: { fontSize: 15, fontWeight: '600', color: '#888' },
  tierTabTextActive: { color: '#B8860B' },

  // ── Plan cards ──
  periodRow: { flexDirection: 'row', gap: 12, marginBottom: 24 },
  planCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#E8E8E8',
    position: 'relative',
    overflow: 'visible',
  },
  planCardSelected: { borderColor: '#B8860B', backgroundColor: '#FFFBF0' },
  planPeriod: { fontSize: 13, fontWeight: '600', color: '#999', marginBottom: 4 },
  planPeriodSelected: { color: '#B8860B' },
  planPrice: { fontSize: 22, fontWeight: '800', color: '#222' },
  planPriceSelected: { color: '#7A5C00' },
  planBillingPeriod: { fontSize: 12, color: '#AAA', marginTop: 2 },
  planBillingPeriodSelected: { color: '#B8860B' },
  planCheck: { position: 'absolute', top: -8, right: -8 },
  savingsBadge: {
    position: 'absolute',
    top: -10,
    left: '50%',
    transform: [{ translateX: -28 }],
    backgroundColor: '#B8860B',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  savingsBadgeText: { color: '#fff', fontSize: 11, fontWeight: '700' },

  // ── Features ──
  featureList: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 8,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#F0F0F0',
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F5',
  },
  featureIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FFF8E1',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  featureText: { flex: 1 },
  featureLabel: { fontSize: 15, fontWeight: '600', color: '#222' },
  featureDesc: { fontSize: 12, color: '#888', marginTop: 1 },

  // ── Subscribe button ──
  subscribeBtn: {
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 12,
    shadowColor: '#B8860B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 6,
  },
  subscribeBtnGradient: { paddingVertical: 20, alignItems: 'center' },
  subscribeBtnText: { fontSize: 18, fontWeight: '700', color: '#fff' },
  subscribeBtnSub: { fontSize: 12, color: 'rgba(255,255,255,0.8)', marginTop: 3 },

  // ── Secondary buttons ──
  restoreBtn: { paddingVertical: 12, alignItems: 'center' },
  restoreBtnText: { fontSize: 15, fontWeight: '600', color: '#B8860B' },
  skipBtn: { paddingVertical: 12, alignItems: 'center' },
  skipBtnText: { fontSize: 15, fontWeight: '500', color: '#AAA' },
  legal: { fontSize: 11, color: '#BBB', textAlign: 'center', lineHeight: 16, marginTop: 16 },

  // ── Active state ──
  activeBadge: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: 16,
    marginTop: 8,
  },
  activeTitle: { fontSize: 26, fontWeight: '800', color: '#111', textAlign: 'center', marginBottom: 4 },
  activeSubtitle: { fontSize: 14, color: '#888', textAlign: 'center', marginBottom: 28 },
  activeFeatureList: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 8,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#F0F0F0',
  },
  manageBtn: {
    borderWidth: 1.5,
    borderColor: '#B8860B',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  manageBtnText: { fontSize: 15, fontWeight: '600', color: '#B8860B' },
});

export default PremiumScreen;
