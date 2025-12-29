/**
 * Verify Account Screen
 * Allows users to verify their account by taking a selfie
 */
import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  Alert,
  ActivityIndicator,
  Image,
  ScrollView,
} from "react-native";
import { CameraView, Camera } from "expo-camera";
import * as ImagePicker from "expo-image-picker";
import { Ionicons } from "@expo/vector-icons";
import {
  verifyAccountWithSelfie,
  getImageVerificationStatus,
} from "../../services/api/verification";
import { useAuth } from "../../context/AuthContext";
import CustomAlert from "../../components/CustomAlert";
import { useCustomAlert } from "../../hooks/useCustomAlert";
import theme from "../../theme/theme";

const VerifyAccountScreen = ({ navigation }) => {
  const { user } = useAuth();
  const [hasPermission, setHasPermission] = useState(null);
  const [cameraType, setCameraType] = useState("front");
  const [capturedImage, setCapturedImage] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [verificationStatus, setVerificationStatus] = useState(null);
  const cameraRef = useRef(null);
  const { alertConfig, showAlert, hideAlert, handleConfirm } = useCustomAlert();

  useEffect(() => {
    checkPermissions();
    loadVerificationStatus();
  }, []);

  const checkPermissions = async () => {
    try {
      console.log("🔍 Checking camera permissions...");
      
      // Add a timeout to prevent hanging
      const permissionPromise = (async () => {
        // First check current permission status using Camera namespace
        const existingStatus = await Camera.getCameraPermissionsAsync();
        console.log("📋 Existing camera permission status:", existingStatus.status);
        
        if (existingStatus.status === "granted") {
          console.log("✅ Camera permission already granted");
          return "granted";
        }
        
        // If not granted, request permission
        console.log("📢 Requesting camera permission...");
        const { status } = await Camera.requestCameraPermissionsAsync();
        console.log("📋 Camera permission status after request:", status);
        return status;
      })();

      // Add timeout fallback (10 seconds)
      const timeoutPromise = new Promise((resolve) => {
        setTimeout(() => {
          console.warn("⏱️ Permission check timed out");
          resolve("timeout");
        }, 10000);
      });

      const status = await Promise.race([permissionPromise, timeoutPromise]);
      
      if (status === "timeout") {
        console.error("⏱️ Permission check timed out, defaulting to false");
        setHasPermission(false);
        showAlert(
          "Permission Timeout",
          "Camera permission check is taking too long. Please check your app permissions in device settings.",
          "warning"
        );
      } else {
        setHasPermission(status === "granted");
        console.log(status === "granted" ? "✅ Permission granted" : "❌ Permission denied");
      }
    } catch (error) {
      console.error("❌ Error checking camera permissions:", error);
      // Set to false on error so UI can still render
      setHasPermission(false);
      showAlert(
        "Permission Error",
        `Failed to check camera permissions: ${error.message || "Unknown error"}. Please try again.`,
        "error"
      );
    }
  };

  const loadVerificationStatus = async () => {
    try {
      const status = await getImageVerificationStatus();
      setVerificationStatus(status);
    } catch (error) {
      console.error("Error loading verification status:", error);
    }
  };

  const takePicture = async () => {
    if (!cameraRef.current) return;

    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.8,
        base64: true,
        skipProcessing: false,
        isImageMirror: false, // Don't mirror the captured image
      });

      // Store both URI and base64 for later use
      setCapturedImage({
        uri: photo.uri,
        base64: photo.base64 ? `data:image/jpeg;base64,${photo.base64}` : null,
      });
    } catch (error) {
      console.error("Error taking picture:", error);
      showAlert("Error", "Failed to capture image. Please try again.", "error");
    }
  };

  const pickFromGallery = async () => {
    try {
      const { status } =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        showAlert(
          "Permission Required",
          "We need access to your photos to select a selfie.",
          "warning"
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
        base64: true,
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        setCapturedImage({
          uri: asset.uri,
          base64: asset.base64
            ? `data:image/jpeg;base64,${asset.base64}`
            : null,
        });
      }
    } catch (error) {
      console.error("Error picking image:", error);
      showAlert("Error", "Failed to select image. Please try again.", "error");
    }
  };

  const uploadAndVerify = async () => {
    if (!capturedImage) {
      showAlert("Error", "Please take or select a selfie first.", "error");
      return;
    }

    try {
      setUploading(true);

      // Use base64 if available, otherwise convert from URI
      let base64Image;
      if (capturedImage.base64) {
        // Base64 already available from camera/gallery
        base64Image = capturedImage.base64;
      } else {
        // Fallback: convert URI to base64 using FileSystem
        const { uri } = capturedImage;
        const response = await fetch(uri);
        const blob = await response.blob();

        // Convert blob to base64
        base64Image = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => {
            resolve(reader.result);
          };
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });
      }

      // Call verification API
      const result = await verifyAccountWithSelfie(base64Image);

      if (result.verified) {
        showAlert(
          "Verification Successful!",
          `Your account has been verified with ${result.confidence.toFixed(
            1
          )}% confidence.`,
          "success"
        );

        // Navigate back to Settings after a delay (Settings screen will reload status on focus)
        setTimeout(() => {
          // Navigate back to Settings (which will then navigate to Profile)
          navigation.navigate("Settings");
        }, 2000);
      } else {
        showAlert(
          "Verification Failed",
          result.message ||
            `Verification failed. Confidence: ${result.confidence?.toFixed(
              1
            )}%. Please ensure your face is clearly visible and matches your profile photos.`,
          "error"
        );
      }
    } catch (error) {
      console.error("Verification error:", error);
      showAlert(
        "Verification Error",
        error.message || "Failed to verify account. Please try again.",
        "error"
      );
    } finally {
      setUploading(false);
    }
  };

  const retakePicture = () => {
    setCapturedImage(null);
  };

  if (hasPermission === null) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.loadingText}>Checking permissions...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (hasPermission === false) {
    return (
      <SafeAreaView style={styles.container}>
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
          <Text style={styles.headerTitle}>Verify Account</Text>
          <View style={styles.headerSpacer} />
        </View>
        <View style={styles.errorContainer}>
          <Ionicons name="camera-outline" size={64} color="#999" />
          <Text style={styles.errorTitle}>Camera Access Required</Text>
          <Text style={styles.errorText}>
            Please enable camera permissions in your device settings to verify
            your account.
          </Text>
          <TouchableOpacity
            style={styles.settingsButton}
            onPress={() => {
              Alert.alert(
                "Open Settings",
                "Please enable camera permissions in your device settings.",
                [
                  { text: "Cancel", style: "cancel" },
                  {
                    text: "Open Settings",
                    onPress: async () => {
                      await checkPermissions();
                    },
                  },
                ]
              );
            }}
          >
            <Text style={styles.settingsButtonText}>Request Permission</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <CustomAlert
        {...alertConfig}
        onConfirm={handleConfirm}
        onClose={hideAlert}
      />

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
        <Text style={styles.headerTitle}>Verify Account</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Instructions */}
        <View style={styles.instructionsContainer}>
          <Text style={styles.instructionsTitle}>Take a Selfie</Text>
          <Text style={styles.instructionsText}>
            Take a clear selfie of yourself to verify your account. Make sure:
          </Text>
          <View style={styles.instructionsList}>
            <View style={styles.instructionItem}>
              <Ionicons name="checkmark-circle" size={20} color="#34C759" />
              <Text style={styles.instructionText}>
                Your face is clearly visible
              </Text>
            </View>
            <View style={styles.instructionItem}>
              <Ionicons name="checkmark-circle" size={20} color="#34C759" />
              <Text style={styles.instructionText}>Good lighting, no shadows</Text>
            </View>
            <View style={styles.instructionItem}>
              <Ionicons name="checkmark-circle" size={20} color="#34C759" />
              <Text style={styles.instructionText}>
                Clear, uncluttered background
              </Text>
            </View>
            <View style={styles.instructionItem}>
              <Ionicons name="checkmark-circle" size={20} color="#34C759" />
              <Text style={styles.instructionText}>
                No other people in the photo
              </Text>
            </View>
            <View style={styles.instructionItem}>
              <Ionicons name="checkmark-circle" size={20} color="#34C759" />
              <Text style={styles.instructionText}>
                Face matches your profile photos
              </Text>
            </View>
          </View>
        </View>

        {/* Camera or Preview */}
        {!capturedImage ? (
          <View style={styles.cameraContainer}>
            <CameraView
              ref={cameraRef}
              style={styles.camera}
              facing={cameraType}
              mode="picture"
              ratio="1:1"
              mirror={false}
            >
              <View style={styles.cameraOverlay}>
                <View style={styles.captureButtonContainer}>
                  <TouchableOpacity
                    style={styles.captureButton}
                    onPress={takePicture}
                  >
                    <View style={styles.captureButtonInner} />
                  </TouchableOpacity>
                </View>
              </View>
            </CameraView>
          </View>
        ) : (
          <View style={styles.previewContainer}>
            <Image
              source={{ uri: capturedImage.uri || capturedImage }}
              style={styles.previewImage}
            />
            <View style={styles.previewActions}>
              <TouchableOpacity
                style={styles.retakeButton}
                onPress={retakePicture}
              >
                <Ionicons name="refresh" size={20} color="#000" />
                <Text style={styles.retakeButtonText}>Retake</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.verifyButton,
                  uploading && styles.verifyButtonDisabled,
                ]}
                onPress={uploadAndVerify}
                disabled={uploading}
              >
                {uploading ? (
                  <ActivityIndicator size="small" color="#FFF" />
                ) : (
                  <>
                    <Ionicons name="checkmark-circle" size={20} color="#FFF" />
                    <Text style={styles.verifyButtonText}>Verify</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E5EA",
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#000",
  },
  headerSpacer: {
    width: 32,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: 24,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: "#666",
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#000",
    marginTop: 16,
    marginBottom: 8,
  },
  errorText: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
    marginBottom: 24,
  },
  settingsButton: {
    backgroundColor: "#000",
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  settingsButtonText: {
    color: "#FFF",
    fontSize: 16,
    fontWeight: "600",
  },
  instructionsContainer: {
    marginBottom: 24,
  },
  instructionsTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#000",
    marginBottom: 12,
  },
  instructionsText: {
    fontSize: 14,
    color: "#666",
    marginBottom: 16,
    lineHeight: 20,
  },
  instructionsList: {
    gap: 12,
  },
  instructionItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  instructionText: {
    fontSize: 14,
    color: "#000",
    flex: 1,
  },
  cameraContainer: {
    width: "100%",
    aspectRatio: 1,
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: "#000",
  },
  camera: {
    flex: 1,
  },
  cameraOverlay: {
    flex: 1,
    backgroundColor: "transparent",
    justifyContent: "flex-end",
    alignItems: "center",
    paddingBottom: 32,
  },
  captureButtonContainer: {
    alignItems: "center",
    marginBottom: 16,
  },
  captureButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "rgba(255, 255, 255, 0.3)",
    borderWidth: 4,
    borderColor: "#FFF",
    justifyContent: "center",
    alignItems: "center",
  },
  captureButtonInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#FFF",
  },
  previewContainer: {
    width: "100%",
    aspectRatio: 1,
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: "#000",
    marginBottom: 24,
  },
  previewImage: {
    width: "100%",
    height: "100%",
  },
  previewActions: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "space-between",
    padding: 16,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  retakeButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF",
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    gap: 8,
  },
  retakeButtonText: {
    color: "#000",
    fontSize: 16,
    fontWeight: "600",
  },
  verifyButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#000",
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    gap: 8,
  },
  verifyButtonDisabled: {
    opacity: 0.6,
  },
  verifyButtonText: {
    color: "#FFF",
    fontSize: 16,
    fontWeight: "600",
  },
});

export default VerifyAccountScreen;
