import React from "react";
import { View, Text, StyleSheet, TextInput } from "react-native";

const ProfileTextInput = ({
  label,
  value,
  onChangeText,
  placeholder,
  multiline = false,
  keyboardType = "default",
  numberOfLines = 1,
}) => {
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
          placeholderTextColor="#999999"
          multiline={multiline}
          numberOfLines={numberOfLines}
          keyboardType={keyboardType}
          textAlignVertical={multiline ? "top" : "center"}
        />
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
  neuInputContainer: {
    backgroundColor: "#F0F0F0",
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
    color: "#000000",
    fontWeight: "400",
    padding: 0,
  },
  neuInputMultiline: {
    minHeight: 80,
    textAlignVertical: "top",
  },
});

export default ProfileTextInput;

