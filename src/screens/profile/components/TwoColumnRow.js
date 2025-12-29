import React from "react";
import { View, StyleSheet } from "react-native";

const TwoColumnRow = ({ children }) => {
  return <View style={styles.twoColumnRow}>{children}</View>;
};

const styles = StyleSheet.create({
  twoColumnRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 20,
  },
});

export default TwoColumnRow;

