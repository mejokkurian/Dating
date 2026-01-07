import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import GradientButton from './GradientButton';
import theme from '../theme/theme';

const EmptyCardState = ({ onRefresh }) => {
  return (
    <View style={styles.noMoreCards}>
      <Text style={styles.noMoreCardsEmoji}>🎉</Text>
      <Text style={styles.noMoreCardsText}>You've seen everyone!</Text>
      <Text style={styles.noMoreCardsSubtext}>
        Check back later for more matches
      </Text>
      <GradientButton
        title="Refresh"
        onPress={onRefresh}
        variant="primary"
        size="medium"
        icon={<Ionicons name="refresh" size={20} color="#FFF" />}
        style={styles.refreshButton}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  noMoreCards: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 40,
  },
  noMoreCardsEmoji: {
    fontSize: 64,
    marginBottom: 20,
  },
  noMoreCardsText: {
    fontSize: 24,
    fontWeight: "bold",
    color: theme.colors.text.primary,
    marginBottom: 10,
    textAlign: "center",
  },
  noMoreCardsSubtext: {
    fontSize: 16,
    color: theme.colors.text.secondary,
    textAlign: "center",
    marginBottom: 30,
  },
  refreshButton: {
    width: 200,
  },
});

export default EmptyCardState;
