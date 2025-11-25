import { auth, GOOGLE_WEB_CLIENT_ID } from './config';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithCredential,
  PhoneAuthProvider,
  GoogleAuthProvider,
  OAuthProvider,
  signOut as firebaseSignOut,
  sendPasswordResetEmail as firebaseSendPasswordResetEmail,
  updateProfile as firebaseUpdateProfile,
  RecaptchaVerifier,
} from 'firebase/auth';
import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import * as AppleAuthentication from 'expo-apple-authentication';
import { Platform } from 'react-native';

// Store for reCAPTCHA verifier (for web)
let recaptchaVerifier = null;

/**
 * Initialize reCAPTCHA verifier (for web platform)
 */
const getRecaptchaVerifier = () => {
  if (Platform.OS === 'web' && !recaptchaVerifier) {
    try {
      recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
        size: 'invisible',
        callback: () => {
          // reCAPTCHA solved
        },
        'expired-callback': () => {
          // reCAPTCHA expired
        },
      });
    } catch (error) {
      console.error('Error creating RecaptchaVerifier:', error);
      return null;
    }
  }
  return recaptchaVerifier;
};

/**
 * Phone number authentication with OTP
 * Note: Firebase JS SDK phone auth is NOT supported in React Native.
 * This implementation provides a clear error message directing users to alternative methods.
 * For production phone auth in React Native, use @react-native-firebase/auth (requires native code).
 */
export const signInWithPhoneNumber = async (phoneNumber) => {
  try {
    // Validate phone number format
    if (!phoneNumber || !phoneNumber.startsWith('+')) {
      throw new Error('Phone number must include country code (e.g., +1234567890)');
    }

    // Firebase JS SDK phone authentication is not supported in React Native
    // Only works on web platform
    if (Platform.OS !== 'web') {
      throw new Error(
        'Phone authentication is not available in React Native with Firebase JS SDK. ' +
        'Please use email login or social login (Google/Apple) instead. ' +
        'For phone authentication, you would need to use @react-native-firebase/auth (requires native code).'
      );
    }

    // For web platform only
    if (!PhoneAuthProvider) {
      throw new Error('Phone authentication is not available. Please use email or social login.');
    }

    const phoneProvider = new PhoneAuthProvider(auth);
    
    // Check if verifyPhoneNumber exists (should only work on web)
    if (typeof phoneProvider.verifyPhoneNumber !== 'function') {
      throw new Error(
        'Phone authentication method not available. ' +
        'Please use email login or social login instead.'
      );
    }
    
    // Set up reCAPTCHA verifier for web
    const verifier = getRecaptchaVerifier();
    if (!verifier) {
      throw new Error('reCAPTCHA verifier initialization failed. Please try again.');
    }

    // Verify phone number and get verification ID (web only)
    const verificationId = await phoneProvider.verifyPhoneNumber(phoneNumber, verifier);
    
    // Return an object that mimics the confirmation result structure
    return {
      verificationId,
      confirm: async (code) => {
        // Create credential from verification ID and code
        const credential = PhoneAuthProvider.credential(verificationId, code);
        // Sign in with credential
        const userCredential = await signInWithCredential(auth, credential);
        return userCredential;
      }
    };
  } catch (error) {
    console.error('Phone auth error:', error);
    
    // If it's already our custom error message, throw it as-is
    if (error.message && (
      error.message.includes('not available') ||
      error.message.includes('not supported') ||
      error.message.includes('Please use email')
    )) {
      throw error;
    }
    
    // Handle Firebase-specific error cases
    if (error.code === 'auth/invalid-phone-number') {
      throw new Error('Invalid phone number format. Please include country code (e.g., +1234567890)');
    } else if (error.code === 'auth/too-many-requests') {
      throw new Error('Too many requests. Please try again later.');
    } else if (error.code === 'auth/quota-exceeded') {
      throw new Error('SMS quota exceeded. Please try again later.');
    } else if (error.code === 'auth/app-not-authorized') {
      throw new Error('App not authorized for phone authentication. Please check Firebase configuration.');
    } else if (error.code === 'auth/captcha-check-failed') {
      throw new Error('reCAPTCHA verification failed. Please try again.');
    } else if (error.message) {
      throw error;
    } else {
      throw new Error('Failed to send verification code. Please try again.');
    }
  }
};

/**
 * Verify OTP code
 */
export const verifyOTP = async (confirmationResult, code) => {
  try {
    // Check if confirmationResult has the confirm method
    if (!confirmationResult || typeof confirmationResult.confirm !== 'function') {
      throw new Error('Invalid confirmation result. Please request a new verification code.');
    }

    // Verify the code
    const userCredential = await confirmationResult.confirm(code);
    return userCredential.user;
  } catch (error) {
    console.error('OTP verification error:', error);
    
    // Handle specific error cases
    if (error.code === 'auth/invalid-verification-code') {
      throw new Error('Invalid verification code. Please try again.');
    } else if (error.code === 'auth/code-expired') {
      throw new Error('Verification code has expired. Please request a new one.');
    } else if (error.code === 'auth/session-expired') {
      throw new Error('Session expired. Please start the verification process again.');
    } else if (error.message) {
      throw error;
    } else {
      throw new Error('Failed to verify code. Please try again.');
    }
  }
};

/**
 * Resend OTP code
 */
export const resendOTP = async (phoneNumber) => {
  try {
    // Use the same function as signInWithPhoneNumber
    return await signInWithPhoneNumber(phoneNumber);
  } catch (error) {
    console.error('Resend OTP error:', error);
    throw error;
  }
};

/**
 * Email/Password authentication
 */
export const signInWithEmail = async (email, password) => {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    return userCredential.user;
  } catch (error) {
    throw error;
  }
};

/**
 * Create account with email/password
 */
export const createAccountWithEmail = async (email, password) => {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    return userCredential.user;
  } catch (error) {
    throw error;
  }
};

// Complete the auth session for better UX
WebBrowser.maybeCompleteAuthSession();

/**
 * Google Sign-In using Firebase
 * 
 * IMPORTANT SETUP INSTRUCTIONS:
 * 
 * 1. Configure OAuth Consent Screen in Google Cloud Console:
 *    - Go to https://console.cloud.google.com
 *    - Select your project: sugar-ac627
 *    - Go to APIs & Services > OAuth consent screen
 *    - Choose "External" (unless you have a Google Workspace)
 *    - Fill in required fields:
 *      * App name: Sugar Dating (or your app name)
 *      * User support email: Your email
 *      * Developer contact: Your email
 *    - Click "Save and Continue"
 *    - Add scopes: email, profile, openid (should be there by default)
 *    - Click "Save and Continue"
 *    - Add test users (if app is in Testing mode):
 *      * Click "Add Users"
 *      * Add your Google email address
 *    - Click "Save and Continue"
 * 
 * 2. Configure Authorized Redirect URIs:
 *    - Go to APIs & Services > Credentials
 *    - Click on your OAuth 2.0 Client ID (Web application)
 *    - Under "Authorized redirect URIs", add:
 *      * https://auth.expo.io/@your-username/sugar-dating-mobile
 *      * Or check the console log for the exact redirect URI
 *    - Click "Save"
 * 
 * 3. Enable Google Sign-In in Firebase:
 *    - Go to Firebase Console > Authentication > Sign-in method
 *    - Enable Google provider
 *    - Copy the Web Client ID
 */
export const signInWithGoogle = async (webClientId = null) => {
  try {
    // Google OAuth discovery document
    const discovery = {
      authorizationEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
      tokenEndpoint: 'https://oauth2.googleapis.com/token',
      revocationEndpoint: 'https://oauth2.googleapis.com/revoke',
    };

    // Get redirect URI
    // For Expo, we use the proxy redirect URI
    const redirectUri = AuthSession.makeRedirectUri({
      useProxy: true,
      scheme: 'com.sugardating.app',
    });

    // Log the redirect URI for debugging (you'll need to add this to Google Cloud Console)
    console.log('Google OAuth Redirect URI:', redirectUri);

    // Get the Web Client ID from config, parameter, or environment variable
    const clientId = webClientId || GOOGLE_WEB_CLIENT_ID || process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;
    
    if (!clientId || clientId === 'YOUR_GOOGLE_WEB_CLIENT_ID_HERE') {
      throw new Error(
        'Google Web Client ID is required.\n\n' +
        'To get your Web Client ID:\n' +
        '1. Go to Firebase Console (https://console.firebase.google.com)\n' +
        '2. Select your project: sugar-ac627\n' +
        '3. Go to Authentication > Sign-in method\n' +
        '4. Click on Google provider\n' +
        '5. Enable it if not already enabled\n' +
        '6. Copy the "Web client ID" (it looks like: xxxxxx-xxxxx.apps.googleusercontent.com)\n\n' +
        'Then add it to src/services/firebase/config.js:\n' +
        'Replace "YOUR_GOOGLE_WEB_CLIENT_ID_HERE" with your actual Web Client ID\n\n' +
        'Alternatively, set EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID environment variable.'
      );
    }

    // Create auth request with PKCE for public clients
    // Use 'code' response type and exchange for ID token
    const request = new AuthSession.AuthRequest({
      clientId,
      scopes: ['openid', 'profile', 'email'],
      responseType: AuthSession.ResponseType.Code,
      redirectUri,
      usePKCE: true, // Required for public clients (mobile apps)
      extraQueryParams: {},
      additionalParameters: {},
    });

    // Get the authorization URL
    const authUrl = await request.makeAuthUrlAsync(discovery);

    // Open the browser for authentication
    const result = await WebBrowser.openAuthSessionAsync(authUrl, redirectUri);

    if (result.type === 'success') {
      // Parse the URL to get the authorization code
      const url = new URL(result.url);
      const code = url.searchParams.get('code');

      if (!code) {
        throw new Error('Failed to get authorization code from Google');
      }

      // Exchange authorization code for tokens (including ID token)
      // For public clients with PKCE, include the code verifier
      const exchangeOptions = {
        clientId,
        code,
        redirectUri,
        extraParams: {},
      };

      // Add code verifier if PKCE is used
      if (request.codeVerifier) {
        exchangeOptions.extraParams.code_verifier = request.codeVerifier;
      }

      const tokenResponse = await AuthSession.exchangeCodeAsync(
        exchangeOptions,
        discovery
      );

      // Get the ID token from the token response
      const idToken = tokenResponse.idToken;

      if (!idToken) {
        throw new Error('Failed to get ID token from Google. Response: ' + JSON.stringify(tokenResponse));
      }

      // Create Firebase credential from ID token
      const credential = GoogleAuthProvider.credential(idToken);
      
      // Sign in to Firebase with Google credential
      const userCredential = await signInWithCredential(auth, credential);
      return userCredential.user;
    } else if (result.type === 'cancel') {
      throw new Error('Google sign-in was cancelled');
    } else {
      throw new Error('Google sign-in failed');
    }
  } catch (error) {
    console.error('Google sign-in error:', error);
    
    // Handle specific error cases
    if (error.code === 'auth/account-exists-with-different-credential') {
      throw new Error('An account already exists with a different sign-in method.');
    } else if (error.code === 'auth/invalid-credential') {
      throw new Error('Invalid Google credential. Please try again.');
    } else if (error.code === 'auth/operation-not-allowed') {
      throw new Error('Google sign-in is not enabled. Please contact support.');
    } else if (error.message) {
      throw error;
    } else {
      throw new Error('Failed to sign in with Google. Please try again.');
    }
  }
};

/**
 * Apple Sign-In (iOS only)
 */
export const signInWithApple = async () => {
  try {
    if (Platform.OS !== 'ios') {
      throw new Error('Apple Sign-In is only available on iOS');
    }
    
    const credential = await AppleAuthentication.signInAsync({
      requestedScopes: [
        AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
        AppleAuthentication.AppleAuthenticationScope.EMAIL,
      ],
    });

    const { identityToken } = credential;
    const provider = new OAuthProvider('apple.com');
    const credential_firebase = provider.credential({
      idToken: identityToken,
    });

    const userCredential = await signInWithCredential(auth, credential_firebase);
    return userCredential.user;
  } catch (error) {
    throw error;
  }
};

/**
 * Sign out
 */
export const signOut = async () => {
  try {
    await firebaseSignOut(auth);
  } catch (error) {
    throw error;
  }
};

/**
 * Get current user
 */
export const getCurrentUser = () => {
  return auth.currentUser;
};

/**
 * Send password reset email
 */
export const sendPasswordResetEmail = async (email) => {
  try {
    await firebaseSendPasswordResetEmail(auth, email);
  } catch (error) {
    throw error;
  }
};

/**
 * Update user profile
 */
export const updateUserProfile = async (updates) => {
  try {
    const user = auth.currentUser;
    if (user) {
      await firebaseUpdateProfile(user, updates);
    }
  } catch (error) {
    throw error;
  }
};
