const admin = require('firebase-admin');

// Initialize Firebase Admin SDK
// Note: Service account key should be downloaded from Firebase Console
// and placed at: backend/config/firebase-service-account.json
// Get it from: Firebase Console > Project Settings > Service Accounts > Generate New Private Key

let firebaseApp;

try {
  // Try to load service account from file
  const serviceAccount = require('./firebase-service-account.json');
  
  firebaseApp = admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
  
  console.log('✅ Firebase Admin SDK initialized successfully');
} catch (error) {
  console.warn('⚠️  Firebase service account not found. Phone auth will not work.');
  console.warn('   Download from: Firebase Console > Project Settings > Service Accounts');
  console.warn('   Place at: backend/config/firebase-service-account.json');
}

module.exports = admin;
