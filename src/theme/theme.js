// Modern Dating App Theme Configuration
export const theme = {
  // Color Palette - Vibrant and Modern
  // Color Palette - Clean White, Black & Blue
  colors: {
    // Primary Gradients
    gradients: {
      primary: ['#000000', '#333333'], // Black to Dark Grey (Buttons/Brand)
      background: ['#FFFFFF', '#F8F9FA'], // White to Off-White (Screens)
      secondary: ['#333333', '#000000'], // Dark Grey to Black
      accent: ['#000000', '#333333'], // Black to Dark Grey
      success: ['#11998e', '#38ef7d'], // Green
      warm: ['#FF6B6B', '#FF8E53'], // Coral
      cool: ['#333333', '#666666'], // Dark Grey
      sunset: ['#FA709A', '#FEE140'], // Pink to Yellow
      ocean: ['#000000', '#333333'], // Black
    },
    
    // Solid Colors
    primary: '#000000',
    secondary: '#000000',
    accent: '#333333',
    
    // Neutrals
    background: '#FFFFFF',
    backgroundDark: '#F8F9FA',
    surface: '#FFFFFF',
    surfaceDark: '#F5F5F5',
    
    // Text
    text: {
      primary: '#000000', // Black
      secondary: '#4A4A4A', // Dark Grey
      tertiary: '#8E8E93', // Light Grey
      inverse: '#FFFFFF', // White (for buttons/dark backgrounds)
      link: '#000000', // Black
    },
    
    // Semantic
    success: '#4CAF50',
    error: '#F44336',
    warning: '#FF9800',
    info: '#000000',
    
    // Overlays
    overlay: 'rgba(0, 0, 0, 0.5)',
    overlayLight: 'rgba(0, 0, 0, 0.1)',
    
    // Glass Effect (Adapted for White Background)
    glass: {
      background: 'rgba(255, 255, 255, 0.8)', // More opaque for white bg
      border: 'rgba(0, 0, 0, 0.1)', // Subtle dark border
      shadow: 'rgba(0, 0, 0, 0.05)', // Subtle dark shadow
    },
  },
  
  // Typography
  typography: {
    fontFamily: {
      regular: 'System',
      medium: 'System',
      semiBold: 'System',
      bold: 'System',
    },
    fontSize: {
      xs: 12,
      sm: 14,
      base: 16,
      lg: 18,
      xl: 20,
      '2xl': 24,
      '3xl': 28,
      '4xl': 32,
      '5xl': 40,
      '6xl': 48,
    },
    fontWeight: {
      regular: '400',
      medium: '500',
      semiBold: '600',
      bold: '700',
      extraBold: '800',
    },
    lineHeight: {
      tight: 1.2,
      normal: 1.5,
      relaxed: 1.75,
    },
  },
  
  // Spacing Scale
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    '2xl': 40,
    '3xl': 48,
    '4xl': 64,
  },
  
  // Border Radius
  borderRadius: {
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
    '2xl': 24,
    '3xl': 32,
    full: 9999,
  },
  
  // Shadows
  shadows: {
    sm: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 2,
    },
    md: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.15,
      shadowRadius: 8,
      elevation: 4,
    },
    lg: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.2,
      shadowRadius: 16,
      elevation: 8,
    },
    xl: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 12 },
      shadowOpacity: 0.25,
      shadowRadius: 24,
      elevation: 12,
    },
    colored: {
      pink: {
        shadowColor: '#FF6B9D',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 12,
        elevation: 6,
      },
      purple: {
        shadowColor: '#667EEA',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 12,
        elevation: 6,
      },
    },
  },
  
  // Animation Durations
  animation: {
    fast: 150,
    normal: 250,
    slow: 350,
    slower: 500,
  },
};

export default theme;
