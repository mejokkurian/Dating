const twilio = require('twilio');

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const serviceSid = process.env.TWILIO_SERVICE_SID;

let client;

if (accountSid && authToken) {
  client = twilio(accountSid, authToken);
} else {
  console.warn('Twilio credentials not found in environment variables');
}

/**
 * Send OTP via SMS using Twilio Verify
 * @param {string} phoneNumber - Phone number in E.164 format (e.g., +1234567890)
 * @returns {Promise<object>} - Twilio verification object
 */
exports.sendOTP = async (phoneNumber) => {
  if (!client || !serviceSid) {
    throw new Error('Twilio service not configured');
  }

  try {
    const verification = await client.verify.v2
      .services(serviceSid)
      .verifications.create({ to: phoneNumber, channel: 'sms' });
    
    return verification;
  } catch (error) {
    console.error('Twilio Send OTP Error:', error);
    throw error;
  }
};

/**
 * Verify OTP code using Twilio Verify
 * @param {string} phoneNumber - Phone number in E.164 format
 * @param {string} code - 6-digit verification code
 * @returns {Promise<boolean>} - True if valid, throws error otherwise
 */
exports.verifyOTP = async (phoneNumber, code) => {
  if (!client || !serviceSid) {
    throw new Error('Twilio service not configured');
  }

  try {
    const verificationCheck = await client.verify.v2
      .services(serviceSid)
      .verificationChecks.create({ to: phoneNumber, code });

    if (verificationCheck.status === 'approved') {
      return true;
    } else {
      throw new Error('Invalid verification code');
    }
  } catch (error) {
    console.error('Twilio Verify OTP Error:', error);
    throw error;
  }
};
