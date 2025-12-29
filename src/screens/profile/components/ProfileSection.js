import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";

const ProfileSection = ({ icon, title, description, children }) => {
  return (
    <View style={styles.neuCard}>
      <View style={styles.sectionHeader}>
        <Ionicons name={icon} size={20} color="#000" />
        <Text style={styles.sectionTitle}>{title}</Text>
      </View>
      {description && (
        <Text style={styles.sectionDescription}>{description}</Text>
      )}
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  neuCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 20,
    marginHorizontal: 20,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#000000",
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  sectionDescription: {
    fontSize: 13,
    color: "#666666",
    marginBottom: 16,
    lineHeight: 18,
  },
});

export default ProfileSection;
