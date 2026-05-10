// ─────────────────────────────────────────────────────────────────────────────
// Emper — Theme Configuration
// Import lightColors / darkColors in ThemeContext.
// Import theme for mode-agnostic tokens (spacing, typography, borderRadius, etc.)
// ─────────────────────────────────────────────────────────────────────────────

// ── Light palette ────────────────────────────────────────────────────────────
export const lightColors = {
  background:  '#FFFFFF',
  surface:     '#F2F2F7',
  surface2:    '#F0F0F0',
  card:        '#FFFFFF',

  text: {
    primary:   '#000000',
    secondary: '#4A4A4A',
    tertiary:  '#999999',
    inverse:   '#FFFFFF',
    link:      '#000000',
  },

  accent:      '#D4AF37',
  accentDark:  '#B8860B',

  border:      'rgba(0,0,0,0.1)',
  inputBg:     '#F2F2F7',
  placeholder: '#8E8E93',

  error:       '#FF4444',
  errorBg:     '#FFE5E5',
  success:     '#4CAF50',
  warning:     '#FF9800',

  overlay:     'rgba(0,0,0,0.5)',
  overlayLight:'rgba(0,0,0,0.1)',

  // Glass morphism (LiquidGlassTabBar)
  tabBarFill:      'rgba(255,255,255,0.95)',
  tabBarBorder:    'rgba(0,0,0,0.1)',
  tabBarIndicator: 'rgba(0,0,0,0.05)',
  tabIconActive:   '#000000',
  tabIconInactive: '#A0A0A0',

  // Chat bubbles
  myMessage:       '#D4AF37',
  theirMessage:    '#F2F2F7',
  myMessageText:   '#000000',
  theirMessageText:'#000000',

  // Gradients
  gradients: {
    primary:    ['#000000', '#333333'],
    background: ['#FFFFFF', '#F8F9FA'],
    secondary:  ['#333333', '#000000'],
    accent:     ['#D4AF37', '#B8860B'],
    success:    ['#11998e', '#38ef7d'],
  },
};

// ── Dark palette ─────────────────────────────────────────────────────────────
export const darkColors = {
  background:  '#0D0D0D',
  surface:     '#1C1C1E',
  surface2:    '#2C2C2E',
  card:        '#1C1C1E',

  text: {
    primary:   '#FFFFFF',
    secondary: '#ABABAB',
    tertiary:  '#636366',
    inverse:   '#000000',
    link:      '#F5C842',
  },

  accent:      '#F5C842',
  accentDark:  '#D4AF37',

  border:      'rgba(255,255,255,0.1)',
  inputBg:     '#1C1C1E',
  placeholder: '#636366',

  error:       '#FF6B6B',
  errorBg:     '#3D1515',
  success:     '#66BB6A',
  warning:     '#FFA726',

  overlay:     'rgba(0,0,0,0.7)',
  overlayLight:'rgba(0,0,0,0.3)',

  // Glass morphism (LiquidGlassTabBar)
  tabBarFill:      'rgba(14,12,8,0.94)',
  tabBarBorder:    'rgba(212,175,55,0.25)',
  tabBarIndicator: 'rgba(212,175,55,0.16)',
  tabIconActive:   '#F5C842',
  tabIconInactive: '#636366',

  // Chat bubbles
  myMessage:       '#D4AF37',
  theirMessage:    '#2C2C2E',
  myMessageText:   '#000000',
  theirMessageText:'#FFFFFF',

  // Gradients
  gradients: {
    primary:    ['#1C1C1E', '#2C2C2E'],
    background: ['#0D0D0D', '#1C1C1E'],
    secondary:  ['#2C2C2E', '#1C1C1E'],
    accent:     ['#F5C842', '#D4AF37'],
    success:    ['#11998e', '#38ef7d'],
  },
};

// ── Mode-agnostic tokens ──────────────────────────────────────────────────────
export const theme = {
  // Keep colors pointing to light for legacy imports
  colors: lightColors,

  typography: {
    fontFamily: {
      regular:  'System',
      medium:   'System',
      semiBold: 'System',
      bold:     'System',
    },
    fontSize: {
      xs:   12,
      sm:   14,
      base: 16,
      lg:   18,
      xl:   20,
      '2xl': 24,
      '3xl': 28,
      '4xl': 32,
      '5xl': 40,
      '6xl': 48,
    },
    fontWeight: {
      regular:   '400',
      medium:    '500',
      semiBold:  '600',
      bold:      '700',
      extraBold: '800',
    },
    lineHeight: {
      tight:   1.2,
      normal:  1.5,
      relaxed: 1.75,
    },
  },

  spacing: {
    xs: 4, sm: 8, md: 16, lg: 24,
    xl: 32, '2xl': 40, '3xl': 48, '4xl': 64,
  },

  borderRadius: {
    sm: 8, md: 12, lg: 16, xl: 20,
    '2xl': 24, '3xl': 32, full: 9999,
  },

  shadows: {
    sm: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 },  shadowOpacity: 0.1,  shadowRadius: 4,  elevation: 2 },
    md: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 },  shadowOpacity: 0.15, shadowRadius: 8,  elevation: 4 },
    lg: { shadowColor: '#000', shadowOffset: { width: 0, height: 8 },  shadowOpacity: 0.2,  shadowRadius: 16, elevation: 8 },
    xl: { shadowColor: '#000', shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.25, shadowRadius: 24, elevation: 12 },
  },

  animation: {
    fast: 150, normal: 250, slow: 350, slower: 500,
  },
};

export default theme;
