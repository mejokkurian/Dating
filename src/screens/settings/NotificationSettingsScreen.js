/**
 * Notification Settings Screen
 * Allows users to manage notification settings
 */
import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  SafeAreaView,
  Alert,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNotification } from "../../context/NotificationContext";
import { openSettings } from "../../services/notifications/pushNotificationService";
import { useTheme } from "../../context/ThemeContext";

const NotificationSettingsScreen = ({ navigation }) => {
  const { colors } = useTheme();
  const styles = makeStyles(colors);

  const {
    permissionStatus,
    expoPushToken,
    loading: notificationLoading,
    requestPermissions,
    retryRequestPermissions,
    checkPermissionStatus,
  } = useNotification();
  const [isEnabled, setIsEnabled] = useState(permissionStatus === "granted");
  const [checkingStatus, setCheckingStatus] = useState(false);

  useEffect(() => {
    setIsEnabled(permissionStatus === "granted");
  }, [permissionStatus]);

  // Check status when screen comes into focus
  useEffect(() => {
    const unsubscribe = navigation.addListener("focus", async () => {
      setCheckingStatus(true);
      await checkPermissionStatus();
      setCheckingStatus(false);
    });

    return unsubscribe;
  }, [navigation, checkPermissionStatus]);

  const handleToggle = async (value) => {
    if (value) {
      // User wants to enable notifications
      const hasPermission = await requestPermissions();
      if (hasPermission) {
        setIsEnabled(true);
        Alert.alert(
          "Notifications Enabled",
          "You will now receive notifications for new messages, matches, and nearby users.",
          [{ text: "OK" }]
        );
      } else {
        // Permission denied
        setIsEnabled(false);
        if (permissionStatus === "denied") {
          Alert.alert(
            "Notifications Disabled",
            "To enable notifications, please go to your device Settings and allow notifications for this app.",
            [
              { text: "Cancel", style: "cancel" },
              {
                text: "Open Settings",
                onPress: () => openSettings(),
              },
            ]
          );
        }
      }
    } else {
      // User wants to disable notifications
      Alert.alert(
        "Disable Notifications?",
        "You will no longer receive push notifications. You can enable them again at any time.",
        [
          {
            text: "Cancel",
            style: "cancel",
            onPress: () => setIsEnabled(true), // Keep switch enabled
          },
          {
            text: "Disable",
            style: "destructive",
            onPress: () => {
              setIsEnabled(false);
              // Note: We can't programmatically disable system notifications,
              // but we can guide user to settings
              Alert.alert(
                "Go to Settings",
                "To disable notifications, please go to your device Settings and turn off notifications for this app.",
                [
                  { text: "Cancel", style: "cancel" },
                  {
                    text: "Open Settings",
                    onPress: () => openSettings(),
                  },
                ]
              );
            },
          },
        ]
      );
    }
  };

  const handleOpenSettings = () => {
    Alert.alert(
      "Open Settings",
      "You will be taken to your device Settings to manage notification permissions.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Open Settings",
          onPress: () => openSettings(),
        },
      ]
    );
  };

  const getStatusText = () => {
    if (checkingStatus || notificationLoading) {
      return "Checking...";
    }

    switch (permissionStatus) {
      case "granted":
        return "Enabled";
      case "denied":
        return "Disabled in Settings";
      case "undetermined":
        return "Not Set";
      default:
        return "Unknown";
    }
  };

  const getStatusColor = () => {
    switch (permissionStatus) {
      case "granted":
        return "#34C759"; // Green
      case "denied":
        return "#FF3B30"; // Red
      default:
        return colors.text.tertiary;
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
              navigation.navigate("Settings");
            }}
            style={styles.backButton}
          >
            <Ionicons name="arrow-back" size={24} color={colors.text.primary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Notification Settings</Text>
          <View style={styles.headerSpacer} />
        </View>

        {/* Notifications Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Notifications</Text>
          <Text style={styles.sectionDescription}>
            Manage how you receive notifications for messages, matches, and
            nearby users.
          </Text>

          {/* Notification Toggle */}
          <View style={styles.settingItem}>
            <View style={styles.settingLeft}>
              <View style={styles.iconContainer}>
                <Ionicons name="notifications" size={24} color={colors.text.primary} />
              </View>
              <View style={styles.settingTextContainer}>
                <Text style={styles.settingTitle}>Push Notifications</Text>
                <Text
                  style={[styles.settingStatus, { color: getStatusColor() }]}
                >
                  {getStatusText()}
                </Text>
              </View>
            </View>
            {checkingStatus || notificationLoading ? (
              <ActivityIndicator size="small" color={colors.text.primary} />
            ) : (
              <Switch
                value={isEnabled}
                onValueChange={handleToggle}
                trackColor={{ false: colors.inputBg, true: colors.surface2 }}
                thumbColor={isEnabled ? colors.text.primary : colors.background}
                ios_backgroundColor={colors.inputBg}
              />
            )}
          </View>

          {/* Additional Info */}
          {permissionStatus === "granted" && expoPushToken && (
            <View style={styles.infoBox}>
              <Ionicons name="checkmark-circle" size={20} color="#34C759" />
              <Text style={styles.infoText}>
                You'll receive notifications for new messages, matches, and
                nearby users.
              </Text>
            </View>
          )}

          {permissionStatus === "denied" && (
            <View style={styles.warningBox}>
              <Ionicons name="alert-circle" size={20} color="#FF9500" />
              <Text style={styles.warningText}>
                Notifications are disabled in your device Settings. Tap "Open
                Settings" below to enable them.
              </Text>
            </View>
          )}

          {/* Open Settings Button */}
          {permissionStatus !== "granted" && (
            <TouchableOpacity
              style={styles.settingsButton}
              onPress={handleOpenSettings}
            >
              <Ionicons name="settings-outline" size={20} color={colors.text.inverse} />
              <Text style={styles.settingsButtonText}>
                Open Device Settings
              </Text>
            </TouchableOpacity>
          )}

          {/* Retry Button */}
          {permissionStatus === "denied" && (
            <TouchableOpacity
              style={styles.retryButton}
              onPress={async () => {
                setCheckingStatus(true);
                const success = await retryRequestPermissions();
                setCheckingStatus(false);
                if (success) {
                  setIsEnabled(true);
                }
              }}
            >
              <Text style={styles.retryButtonText}>
                Retry Permission Request
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Notification Types Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            What You'll Get Notified About
          </Text>
          <View style={styles.notificationTypes}>
            <View style={styles.notificationType}>
              <Ionicons name="chatbubble-ellipses" size={20} color={colors.text.primary} />
              <Text style={styles.notificationTypeText}>New Messages</Text>
            </View>
            <View style={styles.notificationType}>
              <Ionicons name="heart" size={20} color={colors.text.primary} />
              <Text style={styles.notificationTypeText}>New Matches</Text>
            </View>
            <View style={styles.notificationType}>
              <Ionicons name="location" size={20} color={colors.text.primary} />
              <Text style={styles.notificationTypeText}>Nearby Users</Text>
            </View>
          </View>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
};

const makeStyles = (colors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    paddingTop: 20,
    paddingBottom: 20,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 24,
    marginBottom: 24,
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: "800",
    color: colors.text.primary,
  },
  headerSpacer: {
    width: 32,
  },
  section: {
    marginBottom: 32,
    paddingHorizontal: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: colors.text.primary,
    marginBottom: 8,
  },
  sectionDescription: {
    fontSize: 14,
    color: colors.text.secondary,
    marginBottom: 20,
    lineHeight: 20,
  },
  settingItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.surface,
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  settingLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.card,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  settingTextContainer: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.text.primary,
    marginBottom: 4,
  },
  settingStatus: {
    fontSize: 13,
    fontWeight: "500",
  },
  infoBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "#E8F5E9",
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: "#2E7D32",
    marginLeft: 8,
    lineHeight: 18,
  },
  warningBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "#FFF3E0",
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  warningText: {
    flex: 1,
    fontSize: 13,
    color: "#E65100",
    marginLeft: 8,
    lineHeight: 18,
  },
  settingsButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.text.primary,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    marginTop: 8,
  },
  settingsButtonText: {
    color: colors.text.inverse,
    fontSize: 16,
    fontWeight: "600",
    marginLeft: 8,
  },
  retryButton: {
    backgroundColor: colors.surface,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  retryButtonText: {
    color: colors.text.primary,
    fontSize: 15,
    fontWeight: "600",
  },
  notificationTypes: {
    gap: 12,
  },
  notificationType: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    padding: 16,
    borderRadius: 12,
  },
  notificationTypeText: {
    fontSize: 15,
    color: colors.text.primary,
    marginLeft: 12,
    fontWeight: "500",
  },
});

export default NotificationSettingsScreen;
