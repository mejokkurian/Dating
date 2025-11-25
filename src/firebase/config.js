// src/firebase/config.js
import { initializeApp, getApps } from "firebase/app";

// Firebase configuration (from iOS GoogleService-Info.plist)
const firebaseConfig = {
  apiKey: "AIzaSyB1wrUGAOHUekuCZI_F6dYxiC5lhDxsSkk",
  authDomain: "sugar-ac627.firebaseapp.com",
  projectId: "sugar-ac627",
  storageBucket: "sugar-ac627.firebasestorage.app",
  messagingSenderId: "874722826990",
  appId: "1:874722826990:web:d03b64bb4d55c987e871ff",
  measurementId: "G-NHX83KBB3H"
};
// Initialize Firebase only once
let firebaseApp;
if (!getApps().length) {
  firebaseApp = initializeApp(firebaseConfig);
} else {
  firebaseApp = getApps()[0];
}
export { firebaseApp };
