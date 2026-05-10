import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../../../context/ThemeContext";

const ProfileHeader = ({ activeTab, onTabChange, onBackPress }) => {
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  return (
    <View style={styles.headerContainer}>
      {/* Single Row with Back Button and Tabs */}
      <View style={styles.headerRow}>
        <TouchableOpacity onPress={onBackPress} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.text.primary} />
        </TouchableOpacity>
        
        {/* Tab Switcher */}
        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[styles.tab, activeTab === "edit" && styles.tabActive]}
            onPress={() => onTabChange("edit")}
          >
            <Text
              style={[
                styles.tabText,
                activeTab === "edit" && styles.tabTextActive,
              ]}
            >
              Edit
            </Text>
            {activeTab === "edit" && <View style={styles.tabIndicator} />}
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === "view" && styles.tabActive]}
            onPress={() => onTabChange("view")}
          >
            <Text
              style={[
                styles.tabText,
                activeTab === "view" && styles.tabTextActive,
              ]}
            >
              View
            </Text>
            {activeTab === "view" && <View style={styles.tabIndicator} />}
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const makeStyles = (colors) => StyleSheet.create({
  headerContainer: {
    backgroundColor: colors.background,
    paddingTop: 50,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    marginBottom: 20,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  backButton: {
    padding: 8,
    marginRight: 12,
  },
  tabContainer: {
    flex: 1,
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  tab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  tabActive: {},
  tabText: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.text.tertiary,
  },
  tabTextActive: {
    color: colors.text.primary,
    fontWeight: "700",
  },
  tabIndicator: {
    position: "absolute",
    bottom: -1,
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: colors.text.primary,
  },
});

export default ProfileHeader;
