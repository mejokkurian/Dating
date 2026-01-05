const User = require('../models/User');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { sendOTP, verifyOTP } = require('../services/twilioService');

// Generate JWT Token
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: '30d',
  });
};

// @desc    Register new user
// @route   POST /api/auth/register
// @access  Public
exports.register = async (req, res) => {
  try {
    const { email, password, displayName } = req.body;

    // Check if user exists
    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ message: 'User already exists' });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create user
    const user = await User.create({
      email,
      password: hashedPassword,
      displayName,
    });

    if (user) {
      res.status(201).json({
        _id: user._id,
        email: user.email,
        displayName: user.displayName,
        token: generateToken(user._id),
      });
    } else {
      res.status(400).json({ message: 'Invalid user data' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Helper function to fix malformed lastLocation in a user document
const fixMalformedLastLocation = async (userId) => {
  try {
    await User.updateOne(
      { _id: userId },
      { $unset: { lastLocation: "" } }
    );
  } catch (error) {
    console.error(`Error fixing malformed lastLocation for user ${userId}:`, error);
  }
};

// @desc    Authenticate user & get token
// @route   POST /api/auth/login
// @access  Public
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    // Try to find user - handle geospatial index errors gracefully
    let user;
    try {
      user = await User.findOne({ email }).lean();
    } catch (findError) {
      // If error is related to geospatial index, try alternative query
      if (findError.message && findError.message.includes("Can't extract geo keys")) {
        console.error('Geospatial index error during user lookup:', findError);
        // Use aggregation pipeline to bypass index issues
        const users = await User.aggregate([
          { $match: { email: email } },
          { $limit: 1 }
        ]);
        user = users.length > 0 ? users[0] : null;
        
        // If we found the user, try to fix all malformed lastLocation in the collection
        if (user) {
          // Fix this user's lastLocation if malformed
          if (user.lastLocation && (!user.lastLocation.coordinates || 
              !Array.isArray(user.lastLocation.coordinates) || 
              user.lastLocation.coordinates.length !== 2)) {
            await fixMalformedLastLocation(user._id);
            user.lastLocation = undefined;
          }
        }
      } else {
        throw findError;
      }
    }

    if (!user) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    // Check password
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    // Fix malformed lastLocation if it exists (double-check after password verification)
    if (user.lastLocation && (!user.lastLocation.coordinates || 
        !Array.isArray(user.lastLocation.coordinates) || 
        user.lastLocation.coordinates.length !== 2)) {
      await fixMalformedLastLocation(user._id);
      user.lastLocation = undefined;
    }

    res.json({
      _id: user._id,
      email: user.email,
      displayName: user.displayName,
      photos: user.photos || [],
      onboardingCompleted: user.onboardingCompleted || false,
      token: generateToken(user._id),
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: error.message || 'An error occurred during login' });
  }
};

// @desc    Send Phone OTP
// @route   POST /api/auth/phone/send
// @access  Public
exports.sendPhoneOTP = async (req, res) => {
  try {
    const { phoneNumber } = req.body;
    if (!phoneNumber) {
      return res.status(400).json({ message: 'Phone number is required' });
    }

    const result = await sendOTP(phoneNumber);
    res.json(result);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Verify Phone OTP & Login
// @route   POST /api/auth/phone/verify
// @access  Public
exports.verifyPhoneOTP = async (req, res) => {
  try {
    const { phoneNumber, code } = req.body;
    if (!phoneNumber || !code) {
      return res.status(400).json({ message: 'Phone number and code are required' });
    }

    // Verify OTP with Firebase
    const verificationResult = await verifyOTP(phoneNumber, code);
    
    // Check if verification failed
    if (!verificationResult.success) {
      return res.status(400).json({ message: verificationResult.error });
    }

    // Check if user exists
    let user = await User.findOne({ phoneNumber });

    // If user doesn't exist, create a new one
    if (!user) {
      user = await User.create({
        phoneNumber,
        email: `${phoneNumber.replace('+', '')}@phone.user`, // Placeholder email
        displayName: 'New User',
        isVerified: true // Phone is verified
      });
    }

    res.json({
      _id: user._id,
      phoneNumber: user.phoneNumber,
      displayName: user.displayName,
      photos: user.photos,
      onboardingCompleted: user.onboardingCompleted,
      token: generateToken(user._id),
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// @desc    Verify Firebase Phone Token & Login
// @route   POST /api/auth/firebase-phone
// @access  Public
exports.verifyFirebasePhone = async (req, res) => {
  try {
    const { idToken, createAccount } = req.body;
    
    if (!idToken) {
      return res.status(400).json({ message: 'Firebase ID token is required' });
    }

    // Verify the Firebase ID token
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    const phoneNumber = decodedToken.phone_number;

    if (!phoneNumber) {
      return res.status(400).json({ message: 'Phone number not found in token' });
    }

    console.log(`✅ Firebase phone verified: ${phoneNumber}`);

    // Check if user exists
    let user = await User.findOne({ phoneNumber });

    if (!user) {
      // If createAccount flag is not set, return that user needs to create account
      if (!createAccount) {
        return res.json({
          isNewUser: true,
          phoneNumber,
          firebaseUid: decodedToken.uid,
          message: 'Phone verified. Please complete account creation.',
        });
      }

      // Create new user only if createAccount flag is true
      user = await User.create({
        phoneNumber,
        email: `${phoneNumber.replace(/\+/g, '')}@phone.user`, // Placeholder email
        displayName: 'New User',
        isVerified: true, // Phone is verified via Firebase
        firebaseUid: decodedToken.uid,
      });
      
      console.log(`✅ New user created: ${user._id}`);
    } else {
      // Update Firebase UID if not set
      if (!user.firebaseUid) {
        user.firebaseUid = decodedToken.uid;
        await user.save();
      }
      
      console.log(`✅ Existing user logged in: ${user._id}`);
    }

    res.json({
      isNewUser: false,
      _id: user._id,
      phoneNumber: user.phoneNumber,
      displayName: user.displayName,
      photos: user.photos,
      onboardingCompleted: user.onboardingCompleted,
      token: generateToken(user._id),
    });
  } catch (error) {
    console.error('Firebase phone verification error:', error);
    
    if (error.code === 'auth/id-token-expired') {
      return res.status(401).json({ message: 'Token expired. Please try again.' });
    }
    if (error.code === 'auth/argument-error') {
      return res.status(400).json({ message: 'Invalid token format' });
    }
    
    res.status(400).json({ message: error.message || 'Phone verification failed' });
  }
};

// @desc    Social Login (Stub)
// @route   POST /api/auth/social
// @access  Public
exports.socialLogin = async (req, res) => {
  res.status(501).json({ message: 'Not implemented yet' });
};

// @desc    Google Sign-In
// @route   POST /api/auth/google
// @access  Public
exports.googleSignIn = async (req, res) => {
  try {
    const { idToken, email, displayName, photoURL, type } = req.body;

    // Decode idToken to extract user info if not provided in body
    let userEmail = email;
    let userName = displayName;
    let userPhoto = photoURL;
    let googleUserId = null;

    if (idToken) {
        const decoded = jwt.decode(idToken);
        if (decoded) {
            userEmail = userEmail || decoded.email;
            userName = userName || decoded.name;
            userPhoto = userPhoto || decoded.picture;
            googleUserId = decoded.sub;
        }
    }

    if (!userEmail) {
      return res.status(400).json({ message: 'Email is required from Google sign-in' });
    }

    // Check if user exists
    let user = await User.findOne({ email: userEmail });

    // Handle Login Flow
    if (type === 'login') {
      if (!user) {
        return res.status(404).json({ message: 'User not found. Please sign up.' });
      }
    } 
    // Handle Register Flow
    else if (type === 'register') {
      if (user) {
        return res.status(400).json({ message: 'User already exists. Please login.' });
      }
    }

    if (!user) {
      // Create new user
      user = await User.create({
        email: userEmail,
        displayName: userName || 'Google User',
        googleId: googleUserId || idToken, // Prefer sub, fallback to token if needed (though token changes)
        photos: userPhoto ? [userPhoto] : [],
        isVerified: true, // Google accounts are verified
      });
    } else {
      // Update existing user
      if (!user.googleId && googleUserId) {
        user.googleId = googleUserId;
      }
      if (userPhoto && (!user.photos || user.photos.length === 0)) {
        user.photos = [userPhoto];
      }
      await user.save();
    }

    res.json({
      _id: user._id,
      email: user.email,
      displayName: user.displayName,
      photos: user.photos,
      onboardingCompleted: user.onboardingCompleted,
      token: generateToken(user._id),
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Apple Sign-In
// @route   POST /api/auth/apple
// @access  Public
exports.appleSignIn = async (req, res) => {
  try {
    const { identityToken, email, fullName, type } = req.body;

    if (!identityToken) {
      return res.status(400).json({ message: 'Identity token is required' });
    }

    // Decode token to get stable user ID (sub)
    // Note: In a production app, you should verify this token with Apple's public keys
    const decoded = jwt.decode(identityToken);
    
    if (!decoded || !decoded.sub) {
        return res.status(400).json({ message: 'Invalid identity token' });
    }

    const appleUserId = decoded.sub;
    const tokenEmail = decoded.email; // Apple often includes email in the token

    // Check if user exists by appleId (stable sub) or email
    // Prioritize appleId because email might not be present or could be a relay email
    let user = await User.findOne({ appleId: appleUserId });
    
    // If not found by ID, try finding by email if we have one (from body or token)
    const emailToCheck = email || tokenEmail;
    if (!user && emailToCheck) {
        user = await User.findOne({ email: emailToCheck });
    }

    // Handle Login Flow
    if (type === 'login') {
      if (!user) {
        return res.status(404).json({ message: 'User not found. Please sign up.' });
      }
    } 
    // Handle Register Flow
    else if (type === 'register') {
      if (user) {
        return res.status(400).json({ message: 'User already exists. Please login.' });
      }
    }

    if (!user) {
      // Create new user
      const displayName = fullName 
        ? `${fullName.givenName || ''} ${fullName.familyName || ''}`.trim()
        : 'Apple User';

      // Use efficient placeholder if email missing
      const userEmail = emailToCheck || `${appleUserId}@appleid.user`;

      user = await User.create({
        email: userEmail,
        displayName,
        appleId: appleUserId, // Store the stable 'sub'
        isVerified: true, 
      });
    } else {
      // Update existing user
      if (!user.appleId) {
        user.appleId = appleUserId;
      }
      await user.save();
    }

    res.json({
      _id: user._id,
      email: user.email,
      displayName: user.displayName,
      photos: user.photos,
      onboardingCompleted: user.onboardingCompleted,
      token: generateToken(user._id),
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Request password reset
// @route   POST /api/auth/reset-password
// @access  Public
exports.requestPasswordReset = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: 'Email is required' });
    }

    const user = await User.findOne({ email });

    if (!user) {
      // Don't reveal if user exists or not
      return res.json({ message: 'If an account exists, a password reset link has been sent' });
    }

    // Generate reset token (valid for 1 hour)
    const resetToken = jwt.sign(
      { id: user._id, purpose: 'password-reset' },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    // In production, send email with reset link
    // For now, return the token (in production, this should be sent via email)
    console.log('Password reset token:', resetToken);

    res.json({ 
      message: 'If an account exists, a password reset link has been sent',
      // Remove this in production - only for development
      resetToken: process.env.NODE_ENV === 'development' ? resetToken : undefined
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Reset password with token
// @route   POST /api/auth/reset-password/confirm
// @access  Public
exports.confirmPasswordReset = async (req, res) => {
  try {
    const { resetToken, newPassword } = req.body;

    if (!resetToken || !newPassword) {
      return res.status(400).json({ message: 'Reset token and new password are required' });
    }

    // Verify reset token
    const decoded = jwt.verify(resetToken, process.env.JWT_SECRET);

    if (decoded.purpose !== 'password-reset') {
      return res.status(400).json({ message: 'Invalid reset token' });
    }

    // Find user
    const user = await User.findById(decoded.id);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Hash new password
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);
    await user.save();

    res.json({ message: 'Password reset successful' });
  } catch (error) {
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return res.status(400).json({ message: 'Invalid or expired reset token' });
    }
    res.status(500).json({ message: error.message });
  }
};
