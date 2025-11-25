import { initializeApp, getApps } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, initializeFirestore, enableNetwork } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

// Firebase configuration (new sugar-ac627 project)
const firebaseConfig = {
  apiKey: "AIzaSyB1wrUGAOHUekuCZI_F6dYxiC5lhDxsSkk",
  authDomain: "sugar-ac627.firebaseapp.com",
  projectId: "sugar-ac627",
  storageBucket: "sugar-ac627.firebasestorage.app",
  messagingSenderId: "874722826990",
  appId: "1:874722826990:web:d03b64bb4d55c987e871ff",
  measurementId: "G-NHX83KBB3H"
};

// Google OAuth Web Client ID for Google Sign-In
// To get this:
// 1. Go to Firebase Console > Authentication > Sign-in method
// 2. Enable Google sign-in provider
// 3. Copy the "Web client ID" shown in the configuration
// 4. Or get it from Google Cloud Console > APIs & Services > Credentials
//    Look for "OAuth 2.0 Client IDs" with type "Web application"
export const GOOGLE_WEB_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID || 
  "874722826990-e60goaftjr9pnos7enstlvljt1vsb1mr.apps.googleusercontent.com";

// Initialize Firebase only once
let app;
let firestore;

if (!getApps().length) {
  console.log('Initializing Firebase...');
  app = initializeApp(firebaseConfig);
  
  // Initialize Firestore with settings optimized for React Native
  firestore = initializeFirestore(app, {
    experimentalForceLongPolling: true, // Required for React Native
    useFetchStreams: false, // Required for React Native
  });
  
  // Enable network explicitly
  enableNetwork(firestore)
    .then(() => console.log('Firestore network enabled'))
    .catch((error) => console.error('Failed to enable Firestore network:', error));
} else {
  app = getApps()[0];
  firestore = getFirestore(app);
}

export const auth = getAuth(app);
export { firestore };
export const storage = getStorage(app);
export default { auth, firestore, storage };
