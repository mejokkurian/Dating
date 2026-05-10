// ─────────────────────────────────────────────────────────────────────────────
// Subscription constants – single source of truth for tiers, product IDs,
// pricing and feature gates.  Import from here everywhere.
// ─────────────────────────────────────────────────────────────────────────────

export const SUBSCRIPTION_TIERS = {
  FREE: 'free',
  GOLD: 'gold',
  PLATINUM: 'platinum',
};

// These must match the product IDs you create in App Store Connect
// and Google Play Console exactly.
export const PRODUCT_IDS = {
  GOLD_MONTHLY: 'emper_gold_monthly',
  GOLD_YEARLY: 'emper_gold_yearly',
  PLATINUM_MONTHLY: 'emper_platinum_monthly',
  PLATINUM_YEARLY: 'emper_platinum_yearly',
};

export const ALL_PRODUCT_IDS = Object.values(PRODUCT_IDS);

// ─── Pricing ──────────────────────────────────────────────────────────────────

export const SUBSCRIPTION_PLANS = [
  {
    id: PRODUCT_IDS.GOLD_MONTHLY,
    tier: SUBSCRIPTION_TIERS.GOLD,
    period: 'monthly',
    price: '$9.99',
    priceValue: 9.99,
    label: 'Gold',
    billingPeriod: '/ month',
    savings: null,
  },
  {
    id: PRODUCT_IDS.GOLD_YEARLY,
    tier: SUBSCRIPTION_TIERS.GOLD,
    period: 'yearly',
    price: '$59.99',
    priceValue: 59.99,
    label: 'Gold',
    billingPeriod: '/ year',
    savings: 'Save 50%',
  },
  {
    id: PRODUCT_IDS.PLATINUM_MONTHLY,
    tier: SUBSCRIPTION_TIERS.PLATINUM,
    period: 'monthly',
    price: '$19.99',
    priceValue: 19.99,
    label: 'Platinum',
    billingPeriod: '/ month',
    savings: null,
  },
  {
    id: PRODUCT_IDS.PLATINUM_YEARLY,
    tier: SUBSCRIPTION_TIERS.PLATINUM,
    period: 'yearly',
    price: '$99.99',
    priceValue: 99.99,
    label: 'Platinum',
    billingPeriod: '/ year',
    savings: 'Save 58%',
  },
];

// ─── Limits per tier ─────────────────────────────────────────────────────────

export const FREE_DAILY_SWIPE_LIMIT = 10;

export const TIER_LIMITS = {
  [SUBSCRIPTION_TIERS.FREE]: {
    dailySwipes: FREE_DAILY_SWIPE_LIMIT,
    superLikesPerDay: 1,
    rewindsPerDay: 0,
    topPicksCount: 0,
    canSeeWhoLikedYou: false,
    canMessageAnyone: false,
    priorityListing: false,
    boostsPerWeek: 0,
    hideLastSeen: false,
    travelMode: false,
    activeNowVisibility: false,
  },
  [SUBSCRIPTION_TIERS.GOLD]: {
    dailySwipes: Infinity,
    superLikesPerDay: 5,
    rewindsPerDay: 1,
    topPicksCount: 5,
    canSeeWhoLikedYou: true,
    canMessageAnyone: false,
    priorityListing: false,
    boostsPerWeek: 0,
    hideLastSeen: true,
    travelMode: false,
    activeNowVisibility: false,
  },
  [SUBSCRIPTION_TIERS.PLATINUM]: {
    dailySwipes: Infinity,
    superLikesPerDay: Infinity,
    rewindsPerDay: Infinity,
    topPicksCount: Infinity,
    canSeeWhoLikedYou: true,
    canMessageAnyone: true,
    priorityListing: true,
    boostsPerWeek: 1,
    hideLastSeen: true,
    travelMode: true,
    activeNowVisibility: true,
  },
};

// ─── Feature lists shown in PremiumScreen ────────────────────────────────────

export const GOLD_FEATURES = [
  { icon: 'infinite-outline',      label: 'Unlimited Swipes',       desc: 'Never run out of daily swipes' },
  { icon: 'heart-outline',         label: 'See Who Liked You',       desc: 'Know exactly who wants to meet you' },
  { icon: 'star-outline',          label: '5 Adores / Day',          desc: 'Stand out from the crowd' },
  { icon: 'refresh-outline',       label: '1 Rewind / Day',          desc: 'Undo your last swipe' },
  { icon: 'flash-outline',         label: 'Top Picks',               desc: 'See your 5 best daily matches' },
  { icon: 'eye-off-outline',       label: 'Hide Last Seen',          desc: 'Browse completely privately' },
];

export const PLATINUM_FEATURES = [
  { icon: 'infinite-outline',      label: 'Unlimited Swipes',        desc: 'Never run out of daily swipes' },
  { icon: 'heart-outline',         label: 'See Who Liked You',        desc: 'Know exactly who wants to meet you' },
  { icon: 'star-outline',          label: 'Unlimited Adores',         desc: 'Adore as many as you want' },
  { icon: 'refresh-outline',       label: 'Unlimited Rewinds',        desc: 'Undo any swipe, anytime' },
  { icon: 'flash-outline',         label: 'Unlimited Top Picks',      desc: 'See all of your best matches' },
  { icon: 'rocket-outline',        label: 'Priority Listing',         desc: 'Appear first in Discover' },
  { icon: 'chatbubbles-outline',   label: 'Message Anyone',           desc: 'No match required to start a chat' },
  { icon: 'trending-up-outline',   label: '1 Boost / Week',           desc: 'Get seen by 10× more people' },
  { icon: 'airplane-outline',      label: 'Travel Mode',              desc: 'Match in any city worldwide' },
  { icon: 'pulse-outline',         label: 'Active Now Status',        desc: 'See who is online right now' },
  { icon: 'eye-off-outline',       label: 'Hide Last Seen',           desc: 'Browse completely privately' },
];

// Helper: does a given tier have unlimited swipes?
export const hasUnlimitedSwipes = (tier) =>
  tier === SUBSCRIPTION_TIERS.GOLD || tier === SUBSCRIPTION_TIERS.PLATINUM;

// Helper: map a productId back to a tier string
export const tierFromProductId = (productId) => {
  if (!productId) return SUBSCRIPTION_TIERS.FREE;
  if (productId.includes('gold')) return SUBSCRIPTION_TIERS.GOLD;
  if (productId.includes('platinum')) return SUBSCRIPTION_TIERS.PLATINUM;
  return SUBSCRIPTION_TIERS.FREE;
};
