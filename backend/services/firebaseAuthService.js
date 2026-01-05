/**
 * Firebase Authentication Service
 * Handles phone number OTP sending and verification
 * Works without Firebase Admin SDK for development
 */
const admin = require('firebase-admin');

// Initialize Firebase Admin SDK (optional for development)
let firebaseApp = null;
let useFirebase = false;

try {
  // Check if service account key is provided
  const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  
  if (serviceAccountPath) {
    const serviceAccount = require(serviceAccountPath);
    firebaseApp = admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
    useFirebase = true;
    console.log('✅ Firebase Admin SDK initialized successfully');
  } else {
    console.log('ℹ️  Firebase service running in development mode (no Admin SDK)');
    console.log('   OTP codes will be logged to console');
  }
} catch (error) {
  console.log('ℹ️  Firebase Admin SDK not available, using development mode');
  console.log('   OTP codes will be logged to console');
}

// In-memory storage for OTP codes (for development/testing)
// In production, use Redis or database
const otpStore = new Map();

/**
 * Generate a random 6-digit OTP code
 * @returns {string} - 6-digit OTP code
 */
function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * Send OTP (simulated for development)
 * 
 * @param {string} phoneNumber - Phone number in E.164 format
 * @returns {Promise<object>} - Result object
 */
async function sendOTP(phoneNumber) {
  try {

    // Generate OTP code
    const code = generateOTP();
    
    // Store OTP with expiration (5 minutes)
    const expiresAt = Date.now() + 5 * 60 * 1000;
    otpStore.set(phoneNumber, { code, expiresAt });

    console.log(`📱 OTP generated for ${phoneNumber}: ${code}`);
    console.log(`⏰ OTP expires at: ${new Date(expiresAt).toISOString()}`);

    // TODO: Integrate with SMS provider (Twilio, AWS SNS, etc.)
    // For now, we'll just log the OTP
    // In production, you would send the SMS here
    
    // For development: Log the OTP to console
    console.log(`\n🔐 ========== OTP CODE ==========`);
    console.log(`   Phone: ${phoneNumber}`);
    console.log(`   Code: ${code}`);
    console.log(`   Valid for: 5 minutes`);
    console.log(`================================\n`);

    return {
      success: true,
      message: 'OTP sent successfully',
      // In development, include the code in response
      // Remove this in production!
      ...(process.env.NODE_ENV === 'development' && { code }),
    };
  } catch (error) {
    console.error('Error sending OTP:', error);
    throw error;
  }
}

/**
 * Verify OTP code
 * @param {string} phoneNumber - Phone number in E.164 format
 * @param {string} code - OTP code to verify
 * @returns {Promise<object>} - Verification result
 */
async function verifyOTP(phoneNumber, code) {
  try {
    // Get stored OTP
    const storedOTP = otpStore.get(phoneNumber);

    if (!storedOTP) {
      return {
        success: false,
        error: 'No OTP found for this phone number. Please request a new OTP.',
      };
    }

    // Check if OTP has expired
    if (Date.now() > storedOTP.expiresAt) {
      otpStore.delete(phoneNumber);
      return {
        success: false,
        error: 'OTP has expired. Please request a new OTP.',
      };
    }

    // Verify OTP code
    if (storedOTP.code !== code) {
      return {
        success: false,
        error: 'Invalid OTP code. Please try again.',
      };
    }

    // OTP is valid - remove it from store
    otpStore.delete(phoneNumber);

    console.log(`✅ OTP verified successfully for ${phoneNumber}`);

    // Return success without Firebase custom token
    return {
      success: true,
      message: 'OTP verified successfully',
      phoneNumber,
    };
  } catch (error) {
    console.error('Error verifying OTP:', error);
    throw error;
  }
}

/**
 * Clean up expired OTPs (run periodically)
 */
function cleanupExpiredOTPs() {
  const now = Date.now();
  for (const [phoneNumber, otp] of otpStore.entries()) {
    if (now > otp.expiresAt) {
      otpStore.delete(phoneNumber);
      console.log(`🧹 Cleaned up expired OTP for ${phoneNumber}`);
    }
  }
}

// Run cleanup every 5 minutes
setInterval(cleanupExpiredOTPs, 5 * 60 * 1000);

module.exports = {
  sendOTP,
  verifyOTP,
};
