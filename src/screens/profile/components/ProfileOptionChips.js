import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { useTheme } from "../../../context/ThemeContext";

const ProfileOptionChips = ({ label, options, selectedValue, onSelect }) => {
  const { colors } = useTheme();
  const styles = makeStyles(colors);
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

const makeStyles = (colors) => StyleSheet.create({
  inputWrapper: {
    marginBottom: 20,
  },
  label: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.text.primary,
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
    backgroundColor: colors.surface2,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  neuOptionChipActive: {
    backgroundColor: colors.text.primary,
    borderColor: colors.text.primary,
    shadowOpacity: 0.2,
  },
  neuOptionText: {
    fontSize: 14,
    color: colors.text.secondary,
    fontWeight: "500",
  },
  neuOptionTextActive: {
    color: colors.text.inverse,
    fontWeight: "600",
  },
});

export default ProfileOptionChips;
