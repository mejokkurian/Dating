import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../../../context/ThemeContext";

const ProfileSection = ({ icon, title, description, children }) => {
  const { colors } = useTheme();

  return (
    <View style={[styles.neuCard, { backgroundColor: colors.surface }]}>
      <View style={styles.sectionHeader}>
        <Ionicons name={icon} size={20} color={colors.text.secondary} />
        <Text style={[styles.sectionTitle, { color: colors.text.secondary }]}>{title}</Text>
      </View>
      {description && (
        <Text style={[styles.sectionDescription, { color: colors.text.secondary }]}>{description}</Text>
      )}
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  neuCard: {
    borderRadius: 20,
    padding: 20,
    marginHorizontal: 20,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 3,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 1.2,
    textTransform: "uppercase",
  },
  sectionDescription: {
    fontSize: 13,
    marginBottom: 16,
    lineHeight: 18,
  },
});

export default ProfileSection;
