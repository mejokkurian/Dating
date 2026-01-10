import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  ActivityIndicator,
  Alert,
  SafeAreaView,
  StatusBar,
  Image,
  ScrollView,
} from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../../context/AuthContext";
import { verifyAccountWithSelfie } from "../../services/api/verification";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const CAMERA_SIZE = SCREEN_WIDTH * 0.8; // Circular/Card frame size

import VerificationFailureBottomSheet from "./components/VerificationFailureBottomSheet";
import VerificationSuccessBottomSheet from "./components/VerificationSuccessBottomSheet";
import VerificationSkipBottomSheet from "./components/VerificationSkipBottomSheet";

const VerifyAccountScreen = ({ navigation }) => {
  const { onboardingComplete, setOnboardingComplete } = useAuth();
  const [permission, requestPermission] = useCameraPermissions();
  const [cameraRef, setCameraRef] = useState(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [photo, setPhoto] = useState(null); // Captured photo object
  
  // Bottom Sheet States
  const [showErrorSheet, setShowErrorSheet] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [showSuccessSheet, setShowSuccessSheet] = useState(false);
  const [showSkipSheet, setShowSkipSheet] = useState(false);
  
  useEffect(() => {
    if (!permission) {
      requestPermission();
    }
  }, [permission]);

  const handleCapture = async () => {
    if (cameraRef && !isCapturing) {
      setIsCapturing(true);
      try {
        const photoData = await cameraRef.takePictureAsync({
          quality: 0.7,
          base64: true,
        });
        setPhoto(photoData);
      } catch (error) {
        Alert.alert("Error", "Failed to take photo");
      } finally {
        setIsCapturing(false);
      }
    }
  };

  const handleRetake = () => {
    setPhoto(null);
    setShowErrorSheet(false);
  };

  const handleSubmit = async () => {
    if (!photo || !photo.base64) return;

    setVerifying(true);
    try {
      const response = await verifyAccountWithSelfie(photo.base64);
      
      if (response && response.success) {
        setShowSuccessSheet(true);
      } else {
        // Show Bottom Sheet for logical failures (e.g. no match)
        setErrorMessage(response?.message || "Could not verify your identity.");
        setShowErrorSheet(true);
      }
    } catch (error) {
        console.error("Verification Error:", error);
        // Show Bottom Sheet for exceptions/errors
        setErrorMessage(error.message || "An error occurred during verification.");
        setShowErrorSheet(true);
    } finally {
      setVerifying(false);
    }
  };

  const handleCompletion = () => {
    setShowSuccessSheet(false);
    
    if (!onboardingComplete) {
      // Just update state. AuthNavigator will automatically switch stacks to Main App.
      setOnboardingComplete(true);
    } else {
      // For existing users, navigate to the Main Tab, then Discover screen
      // depending on your nesting, "MainTab" is the stack screen name, "Discover" is the tab name
      navigation.navigate("MainTab", { screen: "Discover" });
    }
  };

  const handleSkipPress = () => {
    setShowSkipSheet(true);
  };

  const handleSkipConfirm = () => {
    setShowSkipSheet(false);
    handleCompletion();
  };

  const checklistItems = [
    { text: "Your face is clearly visible", icon: "person-outline" },
    { text: "Good lighting, no shadows", icon: "sunny-outline" },
    { text: "Clear, uncluttered background", icon: "image-outline" },
    { text: "No other people in the photo", icon: "people-outline" },
    { text: "Face matches your profile photos", icon: "id-card-outline" },
  ];

  if (!permission || !permission.granted) {
     return (
        <SafeAreaView style={styles.container}>
            <View style={styles.permissionContainer}>
                <Ionicons name="camera-outline" size={60} color="#666" />
                <Text style={styles.permissionText}>Camera permission is needed for verification.</Text>
                <TouchableOpacity style={styles.button} onPress={requestPermission}>
                    <Text style={styles.buttonText}>Grant Permission</Text>
                </TouchableOpacity>
            </View>
        </SafeAreaView>
     );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#F0F0F0" />
      
      {/* Top Navigation */}
      <View style={styles.topNav}>

        <TouchableOpacity 
            style={styles.skipButton} 
            onPress={handleSkipPress}
        >
            <Text style={styles.skipText}>Skip</Text>
        </TouchableOpacity>
      </View>

      {/* Large Header Matching TopPicks */}
      <View style={styles.header}>
        <Text style={styles.title}>Verify Account</Text>
        <Text style={styles.subtitle}>Take a clear selfie to verify your identity.</Text>
      </View>

      {/* Content - ScrollView to prevent overlaps */}
      <ScrollView 
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        
        {/* Helper Text Section */}
        {!photo && (
            <View style={styles.checklist}>
                {checklistItems.map((item, index) => (
                    <View key={index} style={styles.checklistItem}>
                        <View style={styles.iconContainer}>
                            <Ionicons name={item.icon} size={18} color="#000" />
                        </View>
                        <Text style={styles.checklistText}>{item.text}</Text>
                    </View>
                ))}
            </View>
        )}

        {/* Camera/Photo Section */}
        <View style={styles.cameraSection}>
            <View style={styles.cameraContainer}>
                {photo ? (
                    <Image 
                        source={{ uri: photo.uri }} 
                        style={styles.previewImage} 
                        resizeMode="cover"
                    />
                ) : (
                    <CameraView
                        style={styles.camera}
                        facing="front"
                        ref={(ref) => setCameraRef(ref)}
                    >
                        {/* Overlay Capture Button */}
                        <View style={styles.cameraOverlay}>
                             <TouchableOpacity 
                                style={styles.overlayCaptureBtn} 
                                onPress={handleCapture}
                                activeOpacity={0.7}
                             >
                                <View style={styles.overlayCaptureInner} />
                             </TouchableOpacity>
                        </View>
                    </CameraView>
                )}
            </View>
        </View>

      </ScrollView>

      {/* Actions - Sticky Footer (Only show for Retake/Submit) */}
      {photo && (
        <View style={styles.actionContainer}>
            <View style={styles.actionButtons}>
                <TouchableOpacity 
                    style={styles.verifyButton} 
                    onPress={handleSubmit}
                    disabled={verifying}
                >
                    {verifying ? (
                        <ActivityIndicator color="#FFF" />
                    ) : (
                        <Text style={styles.verifyText}>Verify</Text>
                    )}
                </TouchableOpacity>

                <TouchableOpacity style={styles.retakeButton} onPress={handleRetake}>
                    <Text style={styles.retakeText}>Retake Photo</Text>
                </TouchableOpacity>
            </View>
        </View>
      )}

      {/* Error Bottom Sheet */}
      <VerificationFailureBottomSheet 
        visible={showErrorSheet}
        onClose={() => setShowErrorSheet(false)}
        error={errorMessage}
        onRetake={handleRetake}
      />

      {/* Success Bottom Sheet */}
      <VerificationSuccessBottomSheet 
        visible={showSuccessSheet}
        onClose={handleCompletion}
        onContinue={handleCompletion}
      />

       {/* Skip Confirmation Bottom Sheet */}
       <VerificationSkipBottomSheet 
        visible={showSkipSheet}
        onClose={() => setShowSkipSheet(false)}
        onIgnore={handleSkipConfirm}
        onVerify={() => setShowSkipSheet(false)}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F0F0F0",
  },
  permissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  permissionText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginVertical: 20,
  },
  topNav: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    paddingHorizontal: 20,
    paddingVertical: 5, // Reduced from 10
    zIndex: 10,
  },
  header: {
    paddingHorizontal: 24,
    marginBottom: 5, // Reduced from 10
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    color: '#000000',
    marginBottom: 4, // Reduced from 8
  },
  subtitle: {
    fontSize: 16,
    color: '#666666',
    lineHeight: 22,
  },
  backButton: {
    padding: 5,
  },
  skipButton: {
    padding: 5,
    paddingHorizontal: 10,
  },
  skipText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#666",
  },
  content: {
    padding: 20,
    paddingTop: 0, // Reduced from 10
    paddingBottom: 40,
  },
  // Replaced infoSection with simple view if needed, or just removed
  checklist: {
    gap: 16,
    marginBottom: 30, // Added margin since container padding is removed
    marginTop: 10,
  },
  checklistItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#F5F5F5",
    alignItems: "center",
    justifyContent: "center",
  },
  checklistText: {
    fontSize: 15,
    color: "#333",
    fontWeight: "500",
  },
  cameraSection: {
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 30,
    marginTop: 10,
  },
  cameraContainer: {
    width: CAMERA_SIZE,
    height: CAMERA_SIZE * 1.2,
    borderRadius: 24,
    overflow: "hidden",
    backgroundColor: "#FFFFFF",
    borderWidth: 5,
    borderColor: "#FFFFFF",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
  },
  camera: {
    flex: 1,
  },
  previewImage: {
    width: '100%',
    height: '100%',
  },
  actionContainer: {
    paddingVertical: 20,
    paddingHorizontal: 20,
    paddingBottom: 40, // Extra padding for safety
  },
  actionButtons: {
    width: '100%',
    gap: 12,
  },
  cameraOverlay: {
    flex: 1,
    backgroundColor: 'transparent',
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingBottom: 20,
  },
  overlayCaptureBtn: {
    width: 70,
    height: 70,
    borderRadius: 35,
    borderWidth: 4,
    borderColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  overlayCaptureInner: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: '#FFFFFF',
  },
  retakeButton: {
    width: '100%',
    paddingVertical: 12,
    alignItems: 'center',
  },
  retakeText: {
    color: '#666',
    fontWeight: "600",
    fontSize: 15,
  },
  verifyButton: {
    width: '100%',
    paddingVertical: 16,
    borderRadius: 14,
    backgroundColor: '#000',
    alignItems: 'center',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  verifyText: {
    color: '#FFF',
    fontWeight: "700",
    fontSize: 16,
  },
  button: {
      backgroundColor: '#000',
      paddingVertical: 14,
      paddingHorizontal: 24,
      borderRadius: 12,
  },
  buttonText: {
      color: '#FFF',
      fontWeight: '600',
      fontSize: 16,
  }
});

export default VerifyAccountScreen;
