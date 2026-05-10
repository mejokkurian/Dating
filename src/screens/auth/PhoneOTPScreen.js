import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useAuth } from '../../context/AuthContext';
import CustomAlert from '../../components/CustomAlert';
import { useCustomAlert } from '../../hooks/useCustomAlert';
import { verifyPhoneOTP, signInWithPhoneNumber } from '../../services/api/auth';
import { useNetworkStatus } from '../../hooks/useNetworkStatus';
import * as authAnalytics from '../../services/authAnalytics';
import { AUTH_ERROR_MESSAGES, getAuthErrorMessage } from '../../utils/authErrorMessages';

const RESEND_COOLDOWN_SECONDS = 60;

const PhoneOTPScreen = ({ route, navigation }) => {
  const { phoneNumber, confirmation } = route.params;
  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(RESEND_COOLDOWN_SECONDS);
  const [confirmationObj, setConfirmationObj] = useState(confirmation);
  const inputRefs = useRef(null);
  const loadingRef = useRef(false);
  const resendCooldownRef = useRef(RESEND_COOLDOWN_SECONDS);
  const { alertConfig, showAlert, hideAlert, handleConfirm } = useCustomAlert();
  const { login } = useAuth();
  const { isOffline } = useNetworkStatus();

  useEffect(() => {
    const timer = setTimeout(() => {
      inputRefs.current?.focus();
    }, 300);
    return () => clearTimeout(timer);
  }, []);

  const handleVerify = async (otpCodeInput) => {
    const otpCode = otpCodeInput || code.join('');
    if (otpCode.length !== 6) {
      showAlert('Error', AUTH_ERROR_MESSAGES.OTP_REQUIRED, 'error');
      return;
    }

    if (isOffline) {
      showAlert('Error', AUTH_ERROR_MESSAGES.NO_INTERNET, 'error');
      return;
    }

    try {
      setLoading(true);
      loadingRef.current = true;

      const response = await verifyPhoneOTP(phoneNumber, otpCode);

      if (response && response.token) {
        authAnalytics.trackOTPVerify(true);
        await login(response);

        if (response.onboardingCompleted) {
          if (__DEV__) console.log('User already completed onboarding');
        } else {
          if (__DEV__) console.log('New user or incomplete onboarding');
          navigation.navigate('AgeVerification', { phoneNumber });
        }
      } else {
        authAnalytics.trackOTPVerify(false, 'No token in response');
        showAlert('Error', AUTH_ERROR_MESSAGES.OTP_VERIFY_FAILED, 'error');
      }
    } catch (error) {
      const message = getAuthErrorMessage(error, AUTH_ERROR_MESSAGES.OTP_VERIFY_FAILED);
      authAnalytics.trackOTPVerify(false, message);
      authAnalytics.trackAuthError('phone_otp', message, error.code);
      if (__DEV__) console.error('Verify error:', error);
      showAlert('Error', message, 'error');
    } finally {
      setLoading(false);
      loadingRef.current = false;
    }
  };

  // OTP Resend cooldown timer
  useEffect(() => {
    let interval = null;
    if (resendCooldown > 0) {
      interval = setInterval(() => {
        resendCooldownRef.current = resendCooldownRef.current - 1;
        setResendCooldown(resendCooldownRef.current);
        if (resendCooldownRef.current <= 0) clearInterval(interval);
      }, 1000);
    }
    return () => { if (interval) clearInterval(interval); };
  }, [resendCooldown]);

  const handleResend = async () => {
    if (isOffline) {
      showAlert('Error', AUTH_ERROR_MESSAGES.NO_INTERNET, 'error');
      return;
    }
    if (resendCooldown > 0) {
      showAlert('Error', AUTH_ERROR_MESSAGES.OTP_RESEND_COOLDOWN, 'error');
      return;
    }

    try {
      setLoading(true);
      loadingRef.current = true;
      await signInWithPhoneNumber(phoneNumber);
      authAnalytics.trackOTPSend(true);
      showAlert('Success', 'Verification code resent!', 'success');

      resendCooldownRef.current = RESEND_COOLDOWN_SECONDS;
      setResendCooldown(RESEND_COOLDOWN_SECONDS);

      setCode(['', '', '', '', '', '']);
      setTimeout(() => inputRefs.current?.focus(), 100);
    } catch (error) {
      const errorMessage = getAuthErrorMessage(error, AUTH_ERROR_MESSAGES.OTP_RESEND_FAILED);
      authAnalytics.trackOTPSend(false, errorMessage);
      authAnalytics.trackAuthError('phone_otp_resend', errorMessage, error.code);
      if (__DEV__) console.error('Resend error:', error);
      showAlert('Error', errorMessage, 'error');
    } finally {
      setLoading(false);
      loadingRef.current = false;
    }
  };

  // Determine which box is "active" (next to be filled)
  const filledCount = code.filter(d => d !== '').length;
  const activeIndex = Math.min(filledCount, 5);

  return (
    <View style={styles.overlay}>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.sheet}>
          {/* Drag handle */}
          <View style={styles.handle} />

          <Text style={styles.title}>Enter OTP to verify</Text>
          <Text style={styles.subtitle}>Sent to {phoneNumber}</Text>

          <Text style={styles.inputLabel}>ENTER THE 6 DIGIT OTP</Text>

          {/* OTP Boxes */}
          <View style={styles.codeContainer}>
            {/* Hidden master input */}
            <TextInput
              ref={inputRefs}
              style={styles.hiddenInput}
              value={code.join('')}
              onChangeText={(text) => {
                const cleanText = text.replace(/[^0-9]/g, '').slice(0, 6);
                const newCode = cleanText.split('');
                while (newCode.length < 6) newCode.push('');
                setCode(newCode);
                if (cleanText.length === 6) handleVerify(cleanText);
              }}
              keyboardType="number-pad"
              textContentType="oneTimeCode"
              autoComplete="sms-otp"
              importantForAutofill="yes"
              maxLength={6}
              caretHidden={true}
              autoFocus={true}
            />

            {code.map((digit, index) => (
              <View
                key={index}
                style={[
                  styles.box,
                  index === activeIndex && styles.boxActive,
                ]}
                pointerEvents="none"
              >
                {loading && digit === '' && index === activeIndex ? (
                  <ActivityIndicator size="small" color="#D4AF37" />
                ) : (
                  <Text style={styles.boxDigit}>{digit}</Text>
                )}
              </View>
            ))}
          </View>

          {/* Resend */}
          {resendCooldown > 0 ? (
            <Text style={styles.resendCountdown}>
              <Text style={styles.resendBold}>Resend</Text>
              {` in ${resendCooldown} seconds`}
            </Text>
          ) : (
            <TouchableOpacity onPress={handleResend} disabled={loading}>
              <Text style={styles.resendActive}>Resend OTP</Text>
            </TouchableOpacity>
          )}
        </View>
      </KeyboardAvoidingView>

      <CustomAlert
        visible={alertConfig.visible}
        title={alertConfig.title}
        message={alertConfig.message}
        type={alertConfig.type}
        onClose={hideAlert}
        onConfirm={handleConfirm}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: '#0A0A0A',
    justifyContent: 'flex-end',
  },
  keyboardView: {
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#1A1A1A',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 48,
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: '#3A3A3A',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 14,
    color: '#888888',
    marginBottom: 28,
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#666666',
    letterSpacing: 1,
    marginBottom: 12,
  },
  codeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
    position: 'relative',
    marginBottom: 28,
  },
  hiddenInput: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    opacity: 0.01,
    zIndex: 10,
  },
  box: {
    flex: 1,
    height: 56,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#333333',
    backgroundColor: '#252525',
    alignItems: 'center',
    justifyContent: 'center',
  },
  boxActive: {
    borderColor: '#D4AF37',
    borderWidth: 2,
  },
  boxDigit: {
    fontSize: 22,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  resendCountdown: {
    fontSize: 14,
    color: '#666666',
  },
  resendBold: {
    fontWeight: '700',
    color: '#AAAAAA',
  },
  resendActive: {
    fontSize: 14,
    fontWeight: '700',
    color: '#D4AF37',
  },
});

export default PhoneOTPScreen;
