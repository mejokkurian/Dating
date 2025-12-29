import React from "react";
import { View, Text, StyleSheet } from "react-native";

const ProfileViewField = ({ label, value, children }) => {
  if (!value && !children) return null;

  return (
    <View style={styles.viewFieldWrapper}>
      <Text style={styles.viewFieldLabel}>{label}</Text>
      {children || <Text style={styles.viewFieldValue}>{value}</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  viewFieldWrapper: {
    marginBottom: 20,
  },
  viewFieldLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "#000000",
    marginBottom: 8,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  viewFieldValue: {
    fontSize: 16,
    color: "#333333",
    fontWeight: "400",
    lineHeight: 24,
  },
});

export default ProfileViewField;

