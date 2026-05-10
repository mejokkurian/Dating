import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';

const HomeHeader = ({ isPendingMode, onBack, onProfilePress, onFilterPress, onUndo, canUndo }) => {
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  return (
    <View style={styles.headerWrapper}>
      <LinearGradient
        colors={["rgba(255,255,255,0.08)", "transparent"]}
        style={styles.header}
      >
        <View style={styles.headerLeft}>
          {isPendingMode ? (
            <TouchableOpacity style={styles.glassButton} onPress={onBack}>
              <Ionicons name="arrow-back" size={22} color={colors.text.primary} />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={styles.glassButton} onPress={onProfilePress}>
              <Ionicons name="person-circle-outline" size={24} color={colors.text.primary} />
            </TouchableOpacity>
          )}
        </View>

        {!isPendingMode && (
          <View style={styles.titleContainer}>
            <Text style={styles.headerTitle}>Discover</Text>
            <View style={styles.titleAccent} />
          </View>
        )}

        <View style={styles.headerRight}>
          {!isPendingMode && canUndo && (
            <TouchableOpacity style={styles.glassButton} onPress={onUndo}>
              <Ionicons name="arrow-undo" size={20} color={colors.text.primary} />
            </TouchableOpacity>
          )}
          <TouchableOpacity style={[styles.glassButton, styles.filterBtn]} onPress={onFilterPress}>
            <Ionicons name="options-outline" size={20} color="#D4AF37" />
          </TouchableOpacity>
        </View>
      </LinearGradient>

      {/* Thin gold separator */}
      <View style={styles.separator} />
    </View>
  );
};

const makeStyles = (colors) => StyleSheet.create({
  headerWrapper: {
    zIndex: 10,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 52,
    paddingBottom: 12,
  },
  headerLeft: {
    width: 60,
    alignItems: "flex-start",
  },
  headerRight: {
    width: 80,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 10,
  },
  titleContainer: {
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: "800",
    color: colors.text.primary,
    letterSpacing: 2.5,
    textShadowColor: "rgba(212,175,55,0.18)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 8,
  },
  titleAccent: {
    width: 32,
    height: 2,
    backgroundColor: "#D4AF37",
    borderRadius: 2,
    marginTop: 4,
    opacity: 1,
    shadowColor: "#D4AF37",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 4,
  },
  glassButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.07)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
  },
  filterBtn: {
    backgroundColor: "rgba(212,175,55,0.12)",
    borderColor: "rgba(212,175,55,0.4)",
    shadowColor: "#D4AF37",
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  separator: {
    height: 1,
    backgroundColor: "rgba(212,175,55,0.12)",
    marginHorizontal: 20,
  },
});

export default HomeHeader;
