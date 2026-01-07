import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import theme from '../theme/theme';

const HomeHeader = ({ isPendingMode, onBack, onProfilePress, onFilterPress, onUndo, canUndo }) => {
  return (
    <LinearGradient
      colors={["rgba(255,255,255,0.2)", "transparent"]}
      style={styles.header}
    >
      <View style={styles.headerLeft}>
        {isPendingMode ? (
          <TouchableOpacity
            style={styles.backButton}
            onPress={onBack}
          >
            <Ionicons
              name="arrow-back"
              size={28}
              color={theme.colors.text.primary}
            />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={styles.profileButton}
            onPress={onProfilePress}
          >
            <Ionicons
              name="person-circle-outline"
              size={32}
              color={theme.colors.text.primary}
            />
          </TouchableOpacity>
        )}
      </View>

      {!isPendingMode && <Text style={styles.headerTitle}>Discover</Text>}

      <View style={styles.headerRight}>
        {/* Undo Button */}
        {!isPendingMode && canUndo && (
            <TouchableOpacity
              style={styles.undoButton}
              onPress={onUndo}
            >
              <Ionicons
                name="arrow-undo"
                size={26}
                color={theme.colors.text.primary}
              />
            </TouchableOpacity>
        )}

        <TouchableOpacity
          style={styles.filterButton}
          onPress={onFilterPress}
        >
          <Ionicons
            name="options-outline"
            size={24}
            color={theme.colors.text.primary}
          />
        </TouchableOpacity>
      </View>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 50, // Reduced Safe Area padding
    paddingBottom: 10, // Create less gap below header
    zIndex: 10,
  },
  headerLeft: {
    width: 60, // Increased width
    alignItems: "flex-start",
  },
  headerRight: {
    width: 80, // Increased width to fit 2 buttons
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 12,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: theme.colors.text.primary,
  },
  profileButton: {
    padding: 4,
  },
  backButton: {
    padding: 4,
  },
  filterButton: {
    padding: 4,
  },
  undoButton: {
    padding: 4,
  },
});


export default HomeHeader;
