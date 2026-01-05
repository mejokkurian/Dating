import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";

const ProfileHeader = ({ activeTab, onTabChange, onBackPress }) => {
  return (
    <View style={styles.headerContainer}>
      {/* Single Row with Back Button and Tabs */}
      <View style={styles.headerRow}>
        <TouchableOpacity onPress={onBackPress} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#000" />
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

const styles = StyleSheet.create({
  headerContainer: {
    backgroundColor: "#FFFFFF",
    paddingTop: 50, // Reduced from 60 to save space
    borderBottomWidth: 1,
    borderBottomColor: "#E0E0E0",
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
    borderBottomColor: "#E0E0E0",
  },
  tab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  tabActive: {
    // Active tab styling handled by indicator
  },
  tabText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#999999",
  },
  tabTextActive: {
    color: "#000000",
    fontWeight: "700",
  },
  tabIndicator: {
    position: "absolute",
    bottom: -1,
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: "#000000",
  },
});

export default ProfileHeader;
