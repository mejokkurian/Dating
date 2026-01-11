import { NativeModules, Platform } from 'react-native';

const { LivenessModule } = NativeModules;

/**
 * Starts the AWS Face Liveness session.
 * * @param {string} sessionId - The Session ID from your backend (CreateFaceLivenessSession)
 * @returns {Promise<string>} - Resolves with "Success" or rejects with error.
 */
export const startLivenessCheck = async (sessionId) => {
  if (!sessionId) {
    throw new Error("Session ID is required for Liveness Check.");
  }

  // Double check module installation
  if (!LivenessModule) {
    throw new Error(
      "LivenessModule is not linked. Rebuild your app with 'npx expo run:android' or 'npx expo run:ios'."
    );
  }

  try {
    // This calls the native Kotlin/Swift 'startLiveness' function
    const result = await LivenessModule.startLiveness(sessionId);
    return result; 
  } catch (error) {
    // Standardize error messages
    const message = error.message || "Liveness check cancelled or failed.";
    
    if (message.includes("User cancelled")) {
       throw new Error("Verification cancelled by user.");
    }
    
    throw error;
  }
};
