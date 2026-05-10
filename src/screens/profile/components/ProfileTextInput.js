import React from "react";
import { View, Text, StyleSheet, TextInput } from "react-native";
import { useTheme } from "../../../context/ThemeContext";

const ProfileTextInput = ({
  label,
  value,
  onChangeText,
  placeholder,
  multiline = false,
  keyboardType = "default",
  numberOfLines = 1,
}) => {
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  return (
    <View style={styles.inputWrapper}>
      <Text style={styles.label}>{label}</Text>
      <View
        style={[
          styles.neuInputContainer,
          multiline && styles.neuInputContainerMultiline,
        ]}
      >
        <TextInput
          style={[styles.neuInput, multiline && styles.neuInputMultiline]}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors.placeholder}
          multiline={multiline}
          numberOfLines={numberOfLines}
          keyboardType={keyboardType}
          textAlignVertical={multiline ? "top" : "center"}
        />
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
  neuInputContainer: {
    backgroundColor: colors.surface2,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    borderWidth: 0,
  },
  neuInputContainerMultiline: {
    minHeight: 100,
  },
  neuInput: {
    fontSize: 16,
    color: colors.text.primary,
    fontWeight: "400",
    padding: 0,
  },
  neuInputMultiline: {
    minHeight: 80,
    textAlignVertical: "top",
  },
});

export default ProfileTextInput;

