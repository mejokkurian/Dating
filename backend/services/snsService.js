const AWS = require('@aws-sdk/client-sns');

// Initialize SNS client
const snsClient = new AWS.SNS({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

// In-memory OTP storage (for development - use Redis in production)
const otpStore = new Map();

// OTP expiry time (5 minutes)
const OTP_EXPIRY = 5 * 60 * 1000;

/**
 * Generate a 6-digit OTP
 * @returns {string} - 6-digit OTP
 */
const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

/**
 * Send OTP via SMS using AWS SNS
 * @param {string} phoneNumber - Phone number in E.164 format (e.g., +1234567890)
 * @returns {Promise<object>} - Verification object
 */
exports.sendOTP = async (phoneNumber) => {
  if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY) {
    throw new Error('AWS SNS not configured');
  }

  try {
    // Generate OTP
    const otp = generateOTP();
    
    // Store OTP with expiry
    otpStore.set(phoneNumber, {
      code: otp,
      expiresAt: Date.now() + OTP_EXPIRY,
    });

    // Send SMS via SNS
    const params = {
      Message: `Your verification code is: ${otp}. Valid for 5 minutes.`,
      PhoneNumber: phoneNumber,
      MessageAttributes: {
        'AWS.SNS.SMS.SMSType': {
          DataType: 'String',
          StringValue: 'Transactional', // Use 'Transactional' for OTP messages
        },
      },
    };

    const command = new AWS.PublishCommand(params);
    const result = await snsClient.send(command);

    console.log(`✅ OTP sent to ${phoneNumber} via AWS SNS`);

    return {
      status: 'pending',
      to: phoneNumber,
      channel: 'sms',
      messageId: result.MessageId,
    };
  } catch (error) {
    console.error('AWS SNS Send OTP Error:', error);
    throw error;
  }
};

/**
 * Verify OTP code
 * @param {string} phoneNumber - Phone number in E.164 format
 * @param {string} code - 6-digit verification code
 * @returns {Promise<boolean>} - True if valid, throws error otherwise
 */
exports.verifyOTP = async (phoneNumber, code) => {
  try {
    const stored = otpStore.get(phoneNumber);

    if (!stored) {
      throw new Error('No OTP found for this phone number');
    }

    // Check if OTP expired
    if (Date.now() > stored.expiresAt) {
      otpStore.delete(phoneNumber);
      throw new Error('OTP has expired');
    }

    // Verify code
    if (stored.code !== code) {
      throw new Error('Invalid verification code');
    }

    // OTP is valid - remove from store
    otpStore.delete(phoneNumber);
    
    console.log(`✅ OTP verified for ${phoneNumber}`);
    
    return true;
  } catch (error) {
    console.error('AWS SNS Verify OTP Error:', error);
    throw error;
  }
};

// Clean up expired OTPs every minute
setInterval(() => {
  const now = Date.now();
  for (const [phoneNumber, data] of otpStore.entries()) {
    if (now > data.expiresAt) {
      otpStore.delete(phoneNumber);
    }
  }
}, 60 * 1000);
