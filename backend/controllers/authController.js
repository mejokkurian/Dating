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

// @desc    Authenticate user & get token
// @route   POST /api/auth/login
// @access  Public
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Check for user email
    const user = await User.findOne({ email });

    if (user && (await bcrypt.compare(password, user.password))) {
      res.json({
        _id: user._id,
        email: user.email,
        displayName: user.displayName,
        photos: user.photos,
        onboardingCompleted: user.onboardingCompleted,
        token: generateToken(user._id),
      });
    } else {
      res.status(401).json({ message: 'Invalid email or password' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
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

    await sendOTP(phoneNumber);
    res.json({ message: 'OTP sent successfully' });
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

    // Verify OTP
    await verifyOTP(phoneNumber, code);

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

// @desc    Social Login (Stub)
// @route   POST /api/auth/social
// @access  Public
exports.socialLogin = async (req, res) => {
  res.status(501).json({ message: 'Not implemented yet' });
};
