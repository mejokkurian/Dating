/**
 * Settings Screen
 * Comprehensive settings screen with all app controls organized in sections
 */
import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Switch,
  Alert,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from "../../context/AuthContext";
import ProfileSection from "../profile/components/ProfileSection";
import { updateUserDocument } from "../../services/api/user";
import DeleteAccountBottomSheet from "./components/DeleteAccountBottomSheet";

const SettingsScreen = ({ navigation }) => {
  const { userData, user, setUserData, logout } = useAuth();
  const [profileVisible, setProfileVisible] = useState(
    userData?.isVisibleToOthers !== false
  );
  const [updating, setUpdating] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    // Sync with userData when it changes
    setProfileVisible(userData?.isVisibleToOthers !== false);
  }, [userData]);

  const handleVisibilityToggle = async (value) => {
    try {
      setUpdating(true);
      const updatedData = await updateUserDocument(userData?._id, {
        isVisibleToOthers: value,
      });

      // Update local state
      setProfileVisible(value);
      setUserData((prev) => ({ ...prev, ...updatedData }));

      Alert.alert(
        value ? "Profile Visible" : "Profile Hidden",
        value
          ? "Your profile is now visible to other users in discovery."
          : "Your profile is now hidden. Other users won't see you in discovery.",
        [{ text: "OK" }]
      );
    } catch (error) {
      console.error("Error updating visibility:", error);
      Alert.alert(
        "Error",
        "Failed to update visibility. Please try again.",
        [{ text: "OK" }]
      );
      // Revert toggle on error
      setProfileVisible(!value);
    } finally {
      setUpdating(false);
    }
  };

  const renderMenuItem = (
    icon,
    title,
    subtitle,
    onPress,
    showChevron = true,
    badge = null
  ) => (
    <TouchableOpacity
      style={styles.menuItem}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.menuIconContainer}>
        <Ionicons name={icon} size={20} color="#000" />
      </View>
      <View style={styles.menuTextContainer}>
        <Text style={styles.menuTitle}>{title}</Text>
        {subtitle && <Text style={styles.menuSubtitle}>{subtitle}</Text>}
      </View>
      {badge && <View style={styles.badge}>{badge}</View>}
      {showChevron && <Ionicons name="chevron-forward" size={20} color="#999" />}
    </TouchableOpacity>
  );

  const getLoginMethod = () => {
    // Determine login method from user data
    if (userData?.email) return "Email";
    if (user?.phoneNumber || userData?.phoneNumber) return "Phone";
    if (user?.providerData?.[0]?.providerId === "google.com") return "Google";
    if (user?.providerData?.[0]?.providerId === "apple.com") return "Apple";
    return "Email"; // Default fallback
  };

  const isVerified = userData?.isVerified || false;

  const handleLogout = () => {
    Alert.alert(
      "Logout",
      "Are you sure you want to logout?",
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Logout",
          style: "destructive",
          onPress: async () => {
            try {
              await logout();
              // Navigation will be handled by AuthNavigator based on auth state
            } catch (error) {
              console.error("Error logging out:", error);
              Alert.alert("Error", "Failed to logout. Please try again.");
            }
          },
        },
      ],
      { cancelable: true }
    );
  };

  const [showDeleteSheet, setShowDeleteSheet] = useState(false);

  const handleDeleteAccount = () => {
    setShowDeleteSheet(true);
  };

  const handleConfirmDelete = async () => {
    try {
      setDeleting(true);
      // TODO: Implement delete account API call
      // const response = await deleteUserAccount(userData?._id);
      
      // For now, show placeholder
      setShowDeleteSheet(false);
      Alert.alert(
        "Delete Account",
        "Account deletion feature will be implemented soon. Please contact support for account deletion.",
        [
          {
            text: "OK",
            onPress: () => setDeleting(false),
          },
        ]
      );
    } catch (error) {
      console.error("Error deleting account:", error);
      Alert.alert(
        "Error",
        "Failed to delete account. Please try again or contact support."
      );
      setDeleting(false);
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
              // Always navigate back to Profile when coming from Profile screen
              navigation.navigate("Profile");
            }}
            style={styles.backButton}
          >
            <Ionicons name="arrow-back" size={24} color="#000" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Settings</Text>
          <View style={styles.headerSpacer} />
        </View>

        {/* NOTIFICATIONS Section */}
        <ProfileSection icon="notifications-outline" title="NOTIFICATIONS">
          {renderMenuItem(
            "notifications-outline",
            "Notification Preferences",
            "Manage push notifications and alerts",
            () => navigation.navigate("NotificationSettings")
          )}
        </ProfileSection>

        {/* SECURITY Section */}
        <ProfileSection icon="shield-checkmark-outline" title="SECURITY">
          {renderMenuItem(
            "lock-closed-outline",
            "Login Method",
            `Currently using: ${getLoginMethod()}`,
            () => {
              // Show current login method info (can be expanded to change method later)
              alert(`Current login method: ${getLoginMethod()}\n\nLogin method changes coming soon.`);
            }
          )}
          {renderMenuItem(
            "camera-outline",
            "Image Verification",
            isVerified
              ? "Your account is verified"
              : "Verify your account with selfie",
            () => navigation.navigate("VerifyAccount"),
            true,
            !isVerified ? (
              <View style={styles.verificationBadge}>
                <Text style={styles.verificationBadgeText}>!</Text>
              </View>
            ) : null
          )}
        </ProfileSection>

        {/* PRIVACY Section */}
        <ProfileSection icon="lock-closed-outline" title="PRIVACY">
          <View style={styles.settingItem}>
            <View style={styles.settingLeft}>
              <View style={styles.menuIconContainer}>
                <Ionicons name="eye-outline" size={20} color="#000" />
              </View>
              <View style={styles.settingTextContainer}>
                <Text style={styles.menuTitle}>Profile Visibility</Text>
                <Text style={styles.menuSubtitle}>
                  {profileVisible
                    ? "Your profile is visible to other users"
                    : "Your profile is hidden from other users"}
                </Text>
              </View>
            </View>
            {updating ? (
              <ActivityIndicator size="small" color="#000" />
            ) : (
              <Switch
                value={profileVisible}
                onValueChange={handleVisibilityToggle}
                trackColor={{ false: "#E5E5EA", true: "#D1D1D6" }}
                thumbColor={profileVisible ? "#000" : "#FFFFFF"}
                ios_backgroundColor="#E5E5EA"
              />
            )}
          </View>
          {renderMenuItem(
            "ban-outline",
            "Blocked Users",
            "Manage your block list",
            () => {
              // Navigate to block list (can be implemented later)
              // For now, show placeholder
              alert("Block List feature coming soon");
            },
            true,
            null,
            true
          )}
        </ProfileSection>

        {/* SUBSCRIPTION Section */}
        <ProfileSection icon="diamond-outline" title="SUBSCRIPTION">
          <View style={styles.settingItem}>
            <View style={styles.settingLeft}>
              <View style={styles.menuIconContainer}>
                <Ionicons
                  name={userData?.isPremium ? "diamond" : "diamond-outline"}
                  size={20}
                  color={userData?.isPremium ? "#D4AF37" : "#000"}
                />
              </View>
              <View style={styles.settingTextContainer}>
                <Text style={styles.menuTitle}>
                  {userData?.isPremium ? "Premium Active" : "Free Plan"}
                </Text>
                <Text style={styles.menuSubtitle}>
                  {userData?.isPremium
                    ? userData?.subscriptionPlan
                      ? `${userData.subscriptionPlan.charAt(0).toUpperCase() + userData.subscriptionPlan.slice(1)} Plan`
                      : "Premium Subscription"
                    : "Upgrade to unlock premium features"}
                </Text>
                {userData?.isPremium && userData?.subscriptionExpiryDate && (
                  <Text style={styles.expiryText}>
                    Expires: {new Date(userData.subscriptionExpiryDate).toLocaleDateString()}
                  </Text>
                )}
              </View>
            </View>
            {!userData?.isPremium && (
              <TouchableOpacity
                onPress={() => navigation.navigate("Premium")}
                style={styles.upgradeButton}
              >
                <Text style={styles.upgradeButtonText}>Upgrade</Text>
              </TouchableOpacity>
            )}
          </View>
          {renderMenuItem(
            "refresh-outline",
            "Restore Purchases",
            "Restore your previous subscriptions",
            async () => {
              try {
                Alert.alert(
                  "Restore Purchases",
                  "Checking for previous purchases...",
                  [{ text: "OK" }]
                );
                // TODO: Implement actual restore purchases logic
                // This would typically use expo-in-app-purchases or similar
                Alert.alert(
                  "Restore Purchases",
                  "No previous purchases found, or restore feature coming soon.",
                  [{ text: "OK" }]
                );
              } catch (error) {
                console.error("Error restoring purchases:", error);
                Alert.alert(
                  "Error",
                  "Failed to restore purchases. Please try again.",
                  [{ text: "OK" }]
                );
              }
            },
            true,
            null,
            true
          )}
        </ProfileSection>

        {/* ACCOUNT Section */}
        <ProfileSection icon="person-outline" title="ACCOUNT">
          <View style={styles.settingItem}>
            <View style={styles.settingLeft}>
              <View style={styles.menuIconContainer}>
                <Ionicons name="mail-outline" size={20} color="#000" />
              </View>
              <View style={styles.settingTextContainer}>
                <Text style={styles.menuTitle}>Email</Text>
                <Text style={styles.menuSubtitle} numberOfLines={1}>
                  {userData?.email || "Not set"}
                </Text>
              </View>
            </View>
            <TouchableOpacity
              onPress={() => navigation.navigate("EditEmail")}
              style={styles.editButton}
            >
              <Ionicons name="create-outline" size={18} color="#666" />
            </TouchableOpacity>
          </View>
          <View style={styles.settingItem}>
            <View style={styles.settingLeft}>
              <View style={styles.menuIconContainer}>
                <Ionicons name="call-outline" size={20} color="#000" />
              </View>
              <View style={styles.settingTextContainer}>
                <Text style={styles.menuTitle}>Phone Number</Text>
                <Text style={styles.menuSubtitle} numberOfLines={1}>
                  {userData?.phoneNumber || user?.phoneNumber || "Not set"}
                </Text>
              </View>
            </View>
          </View>
        </ProfileSection>

        {/* HELP Section */}
        <ProfileSection icon="help-buoy-outline" title="HELP & SUPPORT">
           {renderMenuItem(
            "school-outline",
            "Reset App Guide",
            "Show the onboarding tutorial again",
            async () => {
               if (userData?._id) {
                   await AsyncStorage.removeItem(`hasSeenTutorial_${userData._id}`);
               }
               // Also remove legacy key for cleanup
               await AsyncStorage.removeItem('hasSeenTutorial');
               
               Alert.alert(
                 "Guide Reset", 
                 "The onboarding guide will appear next time you visit the home screen.",
                 [{ text: "OK" }]
               );
            }
          )}
        </ProfileSection>


        <ProfileSection icon="document-text-outline" title="LEGAL">
          {renderMenuItem(
            "document-text-outline",
            "Terms of Service",
            "Read our terms and conditions",
            () => {
              // Navigate to Terms of Service (to be implemented)
              Alert.alert(
                "Terms of Service",
                "Terms of Service screen will be implemented soon.",
                [{ text: "OK" }]
              );
            }
          )}
          {renderMenuItem(
            "shield-checkmark-outline",
            "Privacy Policy",
            "Read our privacy policy",
            () => {
              // Navigate to Privacy Policy (to be implemented)
              Alert.alert(
                "Privacy Policy",
                "Privacy Policy screen will be implemented soon.",
                [{ text: "OK" }]
              );
            }
          )}
          {renderMenuItem(
            "information-circle-outline",
            "Cookie Policy",
            "Learn about our cookie usage",
            () => {
              // Navigate to Cookie Policy (to be implemented)
              Alert.alert(
                "Cookie Policy",
                "Cookie Policy screen will be implemented soon.",
                [{ text: "OK" }]
              );
            }
          )}
          {renderMenuItem(
            "code-outline",
            "Open Source Licenses",
            "View third-party licenses",
            () => {
              // Navigate to Licenses (to be implemented)
              Alert.alert(
                "Open Source Licenses",
                "Licenses screen will be implemented soon.",
                [{ text: "OK" }]
              );
            },
            true,
            null,
            true
          )}
        </ProfileSection>

        {/* Logout and Delete Account */}
        <View style={styles.actionButtonsContainer}>
          <TouchableOpacity
            onPress={handleLogout}
            activeOpacity={0.7}
            style={styles.actionTextButton}
          >
            <Text style={styles.logoutButtonText}>Logout</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleDeleteAccount}
            activeOpacity={0.7}
            disabled={deleting}
            style={styles.actionTextButton}
          >
            {deleting ? (
              <ActivityIndicator size="small" color="#FF3B30" />
            ) : (
              <Text style={styles.deleteButtonText}>Delete Account</Text>
            )}
          </TouchableOpacity>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Delete Account Confirmation Bottom Sheet */}
      <DeleteAccountBottomSheet
        visible={showDeleteSheet}
        onClose={() => setShowDeleteSheet(false)}
        onConfirm={handleConfirmDelete}
        loading={deleting}
      />
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
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: "#F5F5F5",
  },
  menuItemLast: {
    borderBottomWidth: 0,
  },
  settingItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: "#F5F5F5",
  },
  settingLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  settingTextContainer: {
    flex: 1,
    marginLeft: 12,
  },
  menuIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#F0F0F0",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  menuTextContainer: {
    flex: 1,
  },
  menuTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: "#000",
    marginBottom: 2,
  },
  menuSubtitle: {
    fontSize: 12,
    color: "#666",
    fontWeight: "400",
  },
  badge: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#FF3B30",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 8,
  },
  verificationBadgeText: {
    color: "#FFF",
    fontSize: 12,
    fontWeight: "700",
  },
  expiryText: {
    fontSize: 11,
    color: "#999",
    marginTop: 2,
    fontStyle: "italic",
  },
  upgradeButton: {
    backgroundColor: "#D4AF37",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  upgradeButtonText: {
    color: "#000",
    fontSize: 13,
    fontWeight: "700",
  },
  editButton: {
    padding: 8,
  },
  actionButtonsContainer: {
    paddingHorizontal: 20,
    marginTop: 8,
    gap: 8,
  },
  actionTextButton: {
    paddingVertical: 12,
    alignItems: "center",
  },
  logoutButtonText: {
    fontSize: 16,
    fontWeight: "500",
    color: "#666",
  },
  deleteButtonText: {
    fontSize: 16,
    fontWeight: "500",
    color: "#FF3B30",
  },
});

export default SettingsScreen;
