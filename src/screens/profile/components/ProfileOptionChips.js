import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";

const ProfileOptionChips = ({ label, options, selectedValue, onSelect }) => {
  return (
    <View style={styles.inputWrapper}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.optionsRow}>
        {options.map((option) => (
          <TouchableOpacity
            key={option}
            style={[
              styles.neuOptionChip,
              selectedValue === option && styles.neuOptionChipActive,
            ]}
            onPress={() => onSelect(option)}
          >
            <Text
              style={[
                styles.neuOptionText,
                selectedValue === option && styles.neuOptionTextActive,
              ]}
            >
              {option}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  inputWrapper: {
    marginBottom: 20,
  },
  label: {
    fontSize: 13,
    fontWeight: "600",
    color: "#000000",
    marginBottom: 10,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  optionsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginTop: 8,
  },
  neuOptionChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E0E0E0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  neuOptionChipActive: {
    backgroundColor: "#000000",
    borderColor: "#000000",
    shadowOpacity: 0.2,
  },
  neuOptionText: {
    fontSize: 14,
    color: "#666666",
    fontWeight: "500",
  },
  neuOptionTextActive: {
    color: "#FFFFFF",
    fontWeight: "600",
  },
});

export default ProfileOptionChips;
