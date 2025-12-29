/**
 * Edit Email Screen
 * Allows users to update their email address
 */
import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  TextInput,
  Alert,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../../context/AuthContext";
import { updateUserDocument } from "../../services/api/user";
import ProfileSection from "../profile/components/ProfileSection";
import ProfileTextInput from "../profile/components/ProfileTextInput";

const EditEmailScreen = ({ navigation }) => {
  const { userData, setUserData } = useAuth();
  const [email, setEmail] = useState(userData?.email || "");
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState("");

  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email.trim()) {
      return "Email is required";
    }
    if (!emailRegex.test(email)) {
      return "Please enter a valid email address";
    }
    return "";
  };

  const handleSave = async () => {
    // Clear previous error
    setError("");

    // Validate email
    const emailError = validateEmail(email);
    if (emailError) {
      setError(emailError);
      return;
    }

    // Check if email is the same
    if (email.toLowerCase() === userData?.email?.toLowerCase()) {
      Alert.alert("No Changes", "Email address is the same.", [{ text: "OK" }]);
      return;
    }

    try {
      setUpdating(true);
      const updatedData = await updateUserDocument(userData?._id, {
        email: email.trim().toLowerCase(),
      });

      // Update local state
      setUserData((prev) => ({ ...prev, ...updatedData }));

      Alert.alert(
        "Email Updated",
        "Your email address has been successfully updated.",
        [
          {
            text: "OK",
            onPress: () => {
              // Navigate back to Settings (which will then navigate to Profile)
              navigation.navigate("Settings");
            },
          },
        ]
      );
    } catch (error) {
      console.error("Error updating email:", error);
      const errorMessage =
        error.response?.data?.message ||
        error.message ||
        "Failed to update email. Please try again.";
      setError(errorMessage);
      Alert.alert("Error", errorMessage, [{ text: "OK" }]);
    } finally {
      setUpdating(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => {
              // Navigate back to Settings (which will then navigate to Profile)
              navigation.navigate("Settings");
            }}
            style={styles.backButton}
          >
            <Ionicons name="arrow-back" size={24} color="#000" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Edit Email</Text>
          <View style={styles.headerSpacer} />
        </View>

        {/* Email Section */}
        <ProfileSection icon="mail-outline" title="EMAIL ADDRESS">
          <ProfileTextInput
            label="Email Address"
            value={email}
            onChangeText={(text) => {
              setEmail(text);
              setError(""); // Clear error when user types
            }}
            placeholder="Enter your email"
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
          />
          {error && (
            <View style={styles.errorContainer}>
              <Ionicons name="alert-circle" size={16} color="#FF3B30" />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}
          <Text style={styles.infoText}>
            You will need to verify your new email address after updating.
          </Text>
        </ProfileSection>

        {/* Save Button */}
        <View style={styles.saveButtonContainer}>
          <TouchableOpacity
            style={[styles.saveButton, updating && styles.saveButtonDisabled]}
            onPress={handleSave}
            disabled={updating}
          >
            {updating ? (
              <ActivityIndicator size="small" color="#FFF" />
            ) : (
              <Text style={styles.saveButtonText}>SAVE CHANGES</Text>
            )}
          </TouchableOpacity>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F0F0F0",
  },
  scrollContent: {
    paddingTop: 60,
    paddingBottom: 20,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: "800",
    color: "#000",
    letterSpacing: -0.5,
  },
  headerSpacer: {
    width: 32,
  },
  errorContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 8,
    marginBottom: 12,
    gap: 8,
  },
  errorText: {
    color: "#FF3B30",
    fontSize: 13,
    fontWeight: "500",
  },
  infoText: {
    fontSize: 12,
    color: "#666",
    fontStyle: "italic",
    marginTop: 8,
  },
  saveButtonContainer: {
    marginHorizontal: 20,
    marginTop: 20,
  },
  saveButton: {
    backgroundColor: "#000",
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: "#FFF",
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
});

export default EditEmailScreen;

