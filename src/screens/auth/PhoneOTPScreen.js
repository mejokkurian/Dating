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
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import CustomAlert from '../../components/CustomAlert';
import { useCustomAlert } from '../../hooks/useCustomAlert';
import RomanticBackground from '../../components/RomanticBackground';
import GlassCard from '../../components/GlassCard';
import theme from '../../theme/theme';
import api from '../../services/api/config';
import { verifyPhoneOTP, signInWithPhoneNumber } from '../../services/api/auth';
import { useNetworkStatus } from '../../hooks/useNetworkStatus';
import * as authAnalytics from '../../services/authAnalytics';
import { AUTH_ERROR_MESSAGES, getAuthErrorMessage } from '../../utils/authErrorMessages';

const PhoneOTPScreen = ({ route, navigation }) => {
  const { phoneNumber, confirmation } = route.params;
  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [confirmationObj, setConfirmationObj] = useState(confirmation);
  const inputRefs = useRef(null);
  const { alertConfig, showAlert, hideAlert, handleConfirm } = useCustomAlert();
  const { login } = useAuth();
  const { isOffline } = useNetworkStatus();

  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;

  useEffect(() => {
    // Animate on mount
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
      }),
    ]).start();

    // Auto-focus input shortly after mounting
    const timer = setTimeout(() => {
      inputRefs.current?.focus();
    }, 500);

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

      // Verify OTP via Twilio backend
      const response = await verifyPhoneOTP(phoneNumber, otpCode);

      if (response && response.token) {
        authAnalytics.trackOTPVerify(true);
        // Authenticate the user
        await login(response); // This will update the auth context
        
        // Check user status and navigate accordingly
        // If user already exists (onboardingComplete is true), login will take care of redirect
        // But we want to be explicit about new users
        if (response.onboardingCompleted) {
          if (__DEV__) {
            console.log('User already completed onboarding');
          }
          // No need to do anything, AuthContext will redirect to Main
        } else {
          if (__DEV__) {
            console.log('New user or incomplete onboarding');
          }
          // Pass phone number to next screen
          navigation.navigate('AgeVerification', {
             phoneNumber: phoneNumber
          });
        }
      } else {
        // Fallback if no token (shouldn't happen with correct API response)
        authAnalytics.trackOTPVerify(false, 'No token in response');
        showAlert('Error', AUTH_ERROR_MESSAGES.OTP_VERIFY_FAILED, 'error');
      }
    } catch (error) {
      const message = getAuthErrorMessage(error, AUTH_ERROR_MESSAGES.OTP_VERIFY_FAILED);
      authAnalytics.trackOTPVerify(false, message);
      authAnalytics.trackAuthError('phone_otp', message, error.code);
      if (__DEV__) {
        console.error('Verify error:', error);
        console.log('Error details:', error.response?.data);
      }
      showAlert('Error', message, 'error');
    } finally {
      setLoading(false);
      loadingRef.current = false;
    }
  };

  // Restore loading state on mount if needed
  useEffect(() => {
    if (loadingRef.current && !loading) {
      setLoading(true);
    }
  }, []);

  // OTP Resend cooldown timer
  useEffect(() => {
    let interval = null;
    if (resendCooldown > 0) {
      interval = setInterval(() => {
        resendCooldownRef.current = resendCooldownRef.current - 1;
        setResendCooldown(resendCooldownRef.current);
        if (resendCooldownRef.current <= 0) {
          clearInterval(interval);
        }
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [resendCooldown]);

  const handleResend = async () => {
    if (isOffline) {
      showAlert('Error', AUTH_ERROR_MESSAGES.NO_INTERNET, 'error');
      return;
    }

    // Check cooldown
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
      
      // Set cooldown
      resendCooldownRef.current = RESEND_COOLDOWN_SECONDS;
      setResendCooldown(RESEND_COOLDOWN_SECONDS);
      
      // Clear existing code and refocus
      setCode(['', '', '', '', '', '']);
      setTimeout(() => inputRefs.current?.focus(), 100);
    } catch (error) {
      const errorMessage = getAuthErrorMessage(error, AUTH_ERROR_MESSAGES.OTP_RESEND_FAILED);
      authAnalytics.trackOTPSend(false, errorMessage);
      authAnalytics.trackAuthError('phone_otp_resend', errorMessage, error.code);
      if (__DEV__) {
        console.error('Resend error:', error);
      }
      showAlert('Error', errorMessage, 'error');
    } finally {
      setLoading(false);
      loadingRef.current = false;
    }
  };

  return (
    <View style={styles.gradient}>
      <RomanticBackground />
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <Animated.View
          style={[
            styles.content,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          {/* Back Button */}
          <TouchableOpacity
            style={styles.backButtonTop}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color="#000000" />
          </TouchableOpacity>

          {/* Header */}
          <View style={styles.header}>
            <View style={styles.iconContainer}>
              <Ionicons name="mail-outline" size={48} color="#D4AF37" />
            </View>
            <Text style={styles.title}>Verify Your Number</Text>
            <Text style={styles.subtitle}>
              Enter the 6-digit code sent to
            </Text>
            <Text style={styles.phoneNumber}>{phoneNumber}</Text>
            {isOffline && (
              <View style={styles.offlineBanner}>
                <Ionicons name="cloud-offline-outline" size={16} color="#FFFFFF" />
                <Text style={styles.offlineBannerText}>No Internet Connection</Text>
              </View>
            )}
          </View>

          {/* OTP Input Section */}
          <View style={styles.codeContainer}>
            {/* HIDDEN MASTER INPUT - Handles typing, pasting, and OS autofill */}
            <TextInput
              ref={inputRefs}
              style={styles.hiddenInputOverlay}
              value={code.join('')}
              onChangeText={(text) => {
                // Filter non-numeric input and limit length
                const cleanText = text.replace(/[^0-9]/g, '').slice(0, 6);
                
                // Update array representation for visual boxes
                const newCode = cleanText.split('');
                while (newCode.length < 6) {
                  newCode.push('');
                }
                
                setCode(newCode);

                // If full code entered/pasted, trigger verify
                if (cleanText.length === 6) {
                  handleVerify(cleanText); 
                }
              }}
              keyboardType="number-pad"
              textContentType="oneTimeCode" // iOS Autofill
              autoComplete="sms-otp" // Android Autofill
              importantForAutofill="yes" // Android accessibility
              maxLength={6}
              caretHidden={true}
              autoFocus={true}
              accessibilityLabel="OTP code input"
              accessibilityHint="Enter the 6-digit verification code sent to your phone"
              accessibilityRole="textbox"
            />

            {/* Visual Digit Boxes */}
            {code.map((digit, index) => (
              <View
                key={index}
                style={styles.codeBoxWrapper}
                pointerEvents="none" // Pass touches through to the TextInput
              >
                <GlassCard style={styles.codeInputCard} opacity={0.9}>
                  <Text style={styles.codeDigit}>{digit}</Text>
                </GlassCard>
              </View>
            ))}
          </View>

          {/* Verify Button */}
          <TouchableOpacity
            style={[styles.verifyButton, loading && styles.buttonDisabled]}
            onPress={() => handleVerify()}
            disabled={loading}
            accessibilityLabel="Verify code button"
            accessibilityHint="Verifies the 6-digit code you entered"
            accessibilityRole="button"
            accessibilityState={{ disabled: loading }}
          >
            {loading ? (
              <ActivityIndicator color="#000000" />
            ) : (
              <View style={styles.buttonContent}>
                <Text style={styles.verifyButtonText}>Verify Code</Text>
                <Ionicons name="checkmark-circle" size={20} color="#000000" />
              </View>
            )}
          </TouchableOpacity>

          {/* Resend Code */}
          <TouchableOpacity
            style={styles.resendButton}
            onPress={handleResend}
            disabled={loading}
          >
            <Text style={styles.resendText}>
              Didn't receive the code?{' '}
              <Text style={styles.resendTextBold}>Resend</Text>
            </Text>
          </TouchableOpacity>

          {/* Change Number */}
          <TouchableOpacity
            style={styles.changeNumberButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.changeNumberText}>Change Phone Number</Text>
          </TouchableOpacity>
        </Animated.View>
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
  gradient: {
    flex: 1,
  },
  container: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: theme.spacing.lg,
  },
  content: {
    width: '100%',
  },
  backButtonTop: {
    position: 'absolute',
    top: -200,
    left: 0,
    padding: 12,
    zIndex: 10,
  },
  header: {
    alignItems: 'center',
    marginBottom: theme.spacing['3xl'],
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(212, 175, 55, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: theme.spacing.lg,
  },
  title: {
    fontSize: theme.typography.fontSize['4xl'],
    fontWeight: theme.typography.fontWeight.extraBold,
    color: '#000000',
    marginBottom: theme.spacing.xs,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.text.secondary,
    opacity: 0.8,
    textAlign: 'center',
    marginTop: theme.spacing.sm,
  },
  phoneNumber: {
    fontSize: theme.typography.fontSize.base,
    color: '#D4AF37',
    fontWeight: theme.typography.fontWeight.semiBold,
    marginTop: theme.spacing.xs,
  },
  codeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: theme.spacing['2xl'],
    gap: 8,
    position: 'relative',
  },
  hiddenInputOverlay: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    opacity: 0.01,
    zIndex: 10,
  },
  codeBoxWrapper: {
    flex: 1,
    height: 64,
  },
  codeInputCard: {
    flex: 1,
    padding: 0,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
  },
  codeDigit: {
    fontSize: 28,
    fontWeight: theme.typography.fontWeight.bold,
    color: '#000000',
  },
  verifyButton: {
    backgroundColor: '#D4AF37',
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: theme.spacing.lg,
    shadowColor: '#D4AF37',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  verifyButtonText: {
    color: '#000000',
    fontSize: 16,
    fontWeight: '700',
  },
  resendButton: {
    alignItems: 'center',
    paddingVertical: theme.spacing.md,
  },
  resendText: {
    color: theme.colors.text.secondary,
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.medium,
  },
  resendTextBold: {
    color: '#D4AF37',
    fontWeight: '700',
    textDecorationLine: 'underline',
  },
  changeNumberButton: {
    alignItems: 'center',
    paddingVertical: theme.spacing.md,
    marginTop: theme.spacing.md,
  },
  changeNumberText: {
    color: theme.colors.text.primary,
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.medium,
    opacity: 0.8,
  },
  offlineBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FF5252',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginTop: 8,
    alignSelf: 'flex-start',
    gap: 6,
  },
  offlineBannerText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
});

export default PhoneOTPScreen;
