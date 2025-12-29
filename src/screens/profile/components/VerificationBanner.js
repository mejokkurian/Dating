import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";

const VerificationBanner = ({ isVerified, onPress }) => {
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
        <Ionicons name="chevron-forward" size={20} color="#666" />
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  verificationBanner: {
    backgroundColor: "#FFF9E6",
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
    color: "#000000",
    marginBottom: 4,
  },
  verificationBannerMessage: {
    fontSize: 12,
    color: "#666666",
    lineHeight: 16,
  },
});

export default VerificationBanner;

