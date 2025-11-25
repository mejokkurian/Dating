import React, { useRef, useEffect } from 'react';
import {
  TouchableOpacity,
  Text,
  View,
  StyleSheet,
  ActivityIndicator,
  Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import theme from '../theme/theme';

const GradientButton = ({
  onPress,
  title,
  loading = false,
  disabled = false,
  variant = 'primary', // primary, secondary, accent, warm, cool
  size = 'medium', // small, medium, large
  style,
  textStyle,
  icon,
}) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const gradientColors = {
    primary: theme.colors.gradients.primary,
    secondary: theme.colors.gradients.accent,
    accent: theme.colors.gradients.secondary,
    warm: theme.colors.gradients.warm,
    cool: theme.colors.gradients.cool,
    sunset: theme.colors.gradients.sunset,
  };

  const sizes = {
    small: {
      paddingVertical: 10,
      paddingHorizontal: 20,
      fontSize: theme.typography.fontSize.sm,
    },
    medium: {
      paddingVertical: 16,
      paddingHorizontal: 32,
      fontSize: theme.typography.fontSize.base,
    },
    large: {
      paddingVertical: 20,
      paddingHorizontal: 40,
      fontSize: theme.typography.fontSize.lg,
    },
  };

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.95,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      friction: 3,
      tension: 40,
      useNativeDriver: true,
    }).start();
  };

  const buttonStyle = sizes[size];
  const colors = gradientColors[variant] || gradientColors.primary;

  return (
    <Animated.View
      style={[
        styles.container,
        { transform: [{ scale: scaleAnim }] },
        disabled && styles.disabled,
        style,
      ]}
    >
      <TouchableOpacity
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={disabled || loading}
        activeOpacity={0.9}
      >
        <LinearGradient
          colors={colors}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[
            styles.gradient,
            {
              paddingVertical: buttonStyle.paddingVertical,
              paddingHorizontal: buttonStyle.paddingHorizontal,
            },
          ]}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <View style={styles.contentContainer}>
              {icon && <Text style={styles.icon}>{icon}</Text>}
              <Text
                style={[
                  styles.text,
                  { fontSize: buttonStyle.fontSize },
                  textStyle,
                ]}
              >
                {title}
              </Text>
            </View>
          )}
        </LinearGradient>
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: theme.borderRadius.lg,
    overflow: 'hidden',
    ...theme.shadows.md,
  },
  gradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: theme.borderRadius.lg,
  },
  contentContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    color: theme.colors.text.inverse,
    fontWeight: theme.typography.fontWeight.semiBold,
    textAlign: 'center',
  },
  icon: {
    marginRight: theme.spacing.sm,
    fontSize: 20,
  },
  disabled: {
    opacity: 0.5,
  },
});

export default GradientButton;
