import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';

/**
 * Reusable InfoCard component for displaying tips and suggestions
 * Used across Activity and Discover screens for consistent premium UI
 */
const InfoCard = ({ title, items = [] }) => {
  const { colors } = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: colors.surface }]}>
      {title && (
        <Text style={[styles.title, { color: colors.text.primary }]}>{title}</Text>
      )}
      {items.map((item, index) => (
        <View key={index} style={styles.item}>
          <View style={styles.iconWrapper}>
            <Ionicons
              name={item.icon}
              size={16}
              color={colors.accent}
            />
          </View>
          <Text style={[styles.text, { color: colors.text.secondary }]}>{item.text}</Text>
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    padding: 24,
    width: '95%',
    alignSelf: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 16,
    textAlign: 'center',
  },
  item: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
    width: '100%',
  },
  iconWrapper: {
    marginTop: 2,
    marginRight: 12,
  },
  text: {
    fontSize: 14,
    lineHeight: 22,
    flex: 1,
    flexWrap: 'wrap',
  },
});

export default InfoCard;
