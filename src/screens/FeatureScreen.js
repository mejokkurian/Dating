import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import theme from '../theme/theme';

const FeatureScreen = () => {
  return (
    <LinearGradient
      colors={theme.colors.gradients.background}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.container}
    >
      <View style={styles.content}>
        <Text style={styles.text}>New Feature</Text>
        <Text style={styles.subText}>Coming Soon</Text>
      </View>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  text: {
    fontSize: 24,
    fontWeight: 'bold',
    color: theme.colors.text.primary,
  },
  subText: {
    fontSize: 16,
    color: theme.colors.text.secondary,
    marginTop: 8,
  },
});

export default FeatureScreen;
