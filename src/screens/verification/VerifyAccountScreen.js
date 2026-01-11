import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  ActivityIndicator,
  SafeAreaView,
  StatusBar,
  ScrollView,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../../context/AuthContext";
import { 
    createLivenessSession, 
    getLivenessSessionResults 
} from "../../services/api/verification";
import { startLivenessCheck } from "../../services/native/LivenessModule";

import VerificationFailureBottomSheet from "./components/VerificationFailureBottomSheet";
import VerificationSuccessBottomSheet from "./components/VerificationSuccessBottomSheet";
import VerificationSkipBottomSheet from "./components/VerificationSkipBottomSheet";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

const VerifyAccountScreen = ({ navigation }) => {
  const { onboardingComplete, setOnboardingComplete } = useAuth();
  const [verifying, setVerifying] = useState(false);
  
  // Bottom Sheet States
  const [showErrorSheet, setShowErrorSheet] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [showSuccessSheet, setShowSuccessSheet] = useState(false);
  const [showSkipSheet, setShowSkipSheet] = useState(false);

  // Main Liveness Handler
  const handleLivenessVerification = async () => {
    setVerifying(true);
    try {
        // 1. Create Session
        const sessionData = await createLivenessSession();
        if (!sessionData || !sessionData.sessionId) {
            throw new Error("Failed to create liveness session.");
        }
        const { sessionId } = sessionData;

        // 2. Start Native Liveness UI
        // This will open the Native Activity (Android) or ViewController (iOS)
        await startLivenessCheck(sessionId);

        // 3. Verify Results (Backend Security Check)
        // If Native Check rejects, we jump to catch block.
        // If resolves, it means "Liveness UI completed successfully", but we still need backend to verify signature.
        const verification = await getLivenessSessionResults(sessionId);
        
        if (verification && verification.success) {
            setShowSuccessSheet(true);
        } else {
            console.log("Verification Failed:", verification.message);
            // Liveness might have passed, but Face Match failed
            setErrorMessage(verification.message || "Face verification failed.");
            setShowErrorSheet(true);
        }

    } catch (error) {
        console.error("Liveness Error:", error);
        
        // Differentiate user cancellation vs actual error
        if (error.message && error.message.includes("cancelled")) {
            // Do simpler alert or nothing
            Alert.alert("Cancelled", "Verification was cancelled.");
        } else {
            setErrorMessage(error.message || "An error occurred during verification.");
            setShowErrorSheet(true);
        }
    } finally {
        setVerifying(false);
    }
  };

  const handleRetry = () => {
    setShowErrorSheet(false);
    // User can just click the button again
  };

  const handleCompletion = () => {
    setShowSuccessSheet(false);
    
    if (!onboardingComplete) {
      setOnboardingComplete(true);
    } else {
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
    { text: "Video selfie verification", icon: "videocam-outline" },
    { text: "Move your face to the oval", icon: "scan-outline" },
    { text: "Good lighting, no shadows", icon: "sunny-outline" },
    { text: "No other people in view", icon: "people-outline" },
    { text: "We compare closely with your profile", icon: "shield-checkmark-outline" },
  ];

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

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Face Verification</Text>
        <Text style={styles.subtitle}>Complete a quick video check to verify you're a real person.</Text>
      </View>

      <ScrollView 
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        
        {/* Checklist Section */}
        <View style={styles.checklist}>
            {checklistItems.map((item, index) => (
                <View key={index} style={styles.checklistItem}>
                    <View style={styles.iconContainer}>
                        <Ionicons name={item.icon} size={20} color="#000" />
                    </View>
                    <Text style={styles.checklistText}>{item.text}</Text>
                </View>
            ))}
        </View>

        {/* Action Button */}
        <View style={styles.actionContainer}>
            <TouchableOpacity 
                style={styles.verifyButton} 
                onPress={handleLivenessVerification}
                disabled={verifying}
            >
                {verifying ? (
                    <ActivityIndicator color="#FFF" />
                ) : (
                    <View style={styles.btnContent}>
                        <Ionicons name="camera" size={20} color="#FFF" style={{ marginRight: 8 }} />
                        <Text style={styles.verifyText}>Start Face Liveness</Text>
                    </View>
                )}
            </TouchableOpacity>
            
            <Text style={styles.securityNote}>
                Your video is analyzed securely by AWS and is not stored permanently.
            </Text>
        </View>

      </ScrollView>

      {/* Error Bottom Sheet */}
      <VerificationFailureBottomSheet 
        visible={showErrorSheet}
        onClose={() => setShowErrorSheet(false)}
        error={errorMessage}
        onRetake={handleRetry}
      />

      {/* Success Bottom Sheet */}
      <VerificationSuccessBottomSheet 
        visible={showSuccessSheet}
        onClose={handleCompletion}
        onContinue={handleCompletion}
      />

       {/* Skip Bottom Sheet */}
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
  topNav: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    paddingHorizontal: 20,
    paddingVertical: 5,
    zIndex: 10,
  },
  header: {
    paddingHorizontal: 24,
    marginBottom: 20,
    marginTop: 10,
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    color: '#000000',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666666',
    lineHeight: 22,
  },
  skipButton: {
    padding: 10,
  },
  skipText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#666",
  },
  content: {
    padding: 24,
    paddingTop: 0,
    paddingBottom: 40,
  },
  checklist: {
    gap: 20,
    marginBottom: 40,
    backgroundColor: '#FFF',
    padding: 20,
    borderRadius: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  checklistItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#F5F5F5",
    alignItems: "center",
    justifyContent: "center",
  },
  checklistText: {
    fontSize: 16,
    color: "#333",
    fontWeight: "500",
    flex: 1,
  },
  actionContainer: {
    alignItems: 'center',
    gap: 16,
  },
  verifyButton: {
    width: '100%',
    paddingVertical: 18,
    borderRadius: 16,
    backgroundColor: '#000',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  btnContent: {
      flexDirection: 'row',
      alignItems: 'center',
  },
  verifyText: {
    color: '#FFF',
    fontWeight: "700",
    fontSize: 18,
  },
  securityNote: {
      fontSize: 12,
      color: '#999',
      textAlign: 'center',
      paddingHorizontal: 20,
  }
});

export default VerifyAccountScreen;
