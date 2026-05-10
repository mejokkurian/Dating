import React from 'react';
import { View, StyleSheet } from 'react-native';
import theme from '../theme/theme';
import { useTheme } from '../context/ThemeContext';

const GlassCard = ({
  children,
  style,
  opacity = 0.15,
  blur = 10,
  borderWidth = 1,
}) => {
  const { colors } = useTheme();
  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.overlayLight,
          borderWidth,
          borderColor: colors.border,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    ...theme.shadows.md,
    // Note: React Native doesn't support backdrop-filter
    // This is a simplified glassmorphism effect
    // For true blur, consider using @react-native-community/blur
  },
});

export default GlassCard;
