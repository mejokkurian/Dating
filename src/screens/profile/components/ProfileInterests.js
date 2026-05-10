import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../../../context/ThemeContext";

const ProfileInterests = ({ interests, onAdd, onRemove }) => {
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  return (
    <View style={styles.inputWrapper}>
      <Text style={styles.label}>Interests</Text>
      <View style={styles.interestsContainer}>
        {interests.map((interest, index) => (
          <View key={index} style={styles.neuInterestChip}>
            <Text style={styles.neuInterestText}>{interest}</Text>
            <TouchableOpacity onPress={() => onRemove(index)}>
              <Ionicons name="close-circle" size={18} color={colors.text.secondary} />
            </TouchableOpacity>
          </View>
        ))}
        <TouchableOpacity onPress={onAdd} style={styles.addInterestButton}>
          <Ionicons name="add-circle" size={24} color={colors.text.primary} />
        </TouchableOpacity>
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
  interestsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginTop: 10,
  },
  neuInterestChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
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
  neuInterestText: {
    fontSize: 14,
    color: colors.text.primary,
    fontWeight: "500",
  },
  addInterestButton: {
    padding: 4,
    alignSelf: "flex-start",
  },
});

export default ProfileInterests;
