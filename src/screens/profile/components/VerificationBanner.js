import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../../../context/ThemeContext";

const VerificationBanner = ({ isVerified, onPress }) => {
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  if (isVerified) return null;

  return (
    <TouchableOpacity style={styles.verificationBanner} onPress={onPress}>
      <View style={styles.verificationBannerContent}>
        <Ionicons name="warning" size={20} color="#D4AF37" />
        <View style={styles.verificationBannerTextContainer}>
          <Text style={styles.verificationBannerTitle}>
            Verify Your Images
          </Text>
          <Text style={styles.verificationBannerMessage}>
            Verify that the uploaded images are you
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color={colors.text.secondary} />
      </View>
    </TouchableOpacity>
  );
};

const makeStyles = (colors) => StyleSheet.create({
  verificationBanner: {
    backgroundColor: colors.surface,
    marginHorizontal: 20,
    marginTop: 10,
    marginBottom: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#D4AF37",
    overflow: "hidden",
  },
  verificationBannerContent: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    gap: 12,
  },
  verificationBannerTextContainer: {
    flex: 1,
  },
  verificationBannerTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.text.primary,
    marginBottom: 4,
  },
  verificationBannerMessage: {
    fontSize: 12,
    color: colors.text.secondary,
    lineHeight: 16,
  },
});

export default VerificationBanner;

