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
import auth from '@react-native-firebase/auth';
import axios from 'axios';
import { API_URL } from '../../services/api/config';
import { useAuth } from '../../context/AuthContext';
import CustomAlert from '../../components/CustomAlert';
import { useCustomAlert } from '../../hooks/useCustomAlert';
import RomanticBackground from '../../components/RomanticBackground';
import GlassCard from '../../components/GlassCard';
import theme from '../../theme/theme';

const PhoneOTPScreen = ({ route, navigation }) => {
  const { phoneNumber, confirmation } = route.params;
  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const inputRefs = useRef(null);
  const { alertConfig, showAlert, hideAlert, handleConfirm } = useCustomAlert();
  const { login } = useAuth();

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
      showAlert('Error', 'Please enter the complete 6-digit code', 'error');
      return;
    }

    try {
      setLoading(true);

      // Confirm the verification code with Firebase
      const credential = await confirmation.confirm(otpCode);
      
      // Get Firebase ID token
      const idToken = await credential.user.getIdToken();

      // Send token to backend to check if user exists
      const response = await axios.post(`${API_URL}/auth/firebase-phone`, {
        idToken,
        createAccount: false, // First check if user exists
      });

      // Check if this is a new user
      if (response.data.isNewUser) {
        console.log('✅ New user - navigating to onboarding');
        
        // Store the ID token and phone for account creation
        // Navigate to age verification (first step of onboarding)
        navigation.navigate('AgeVerification', {
          phoneNumber: response.data.phoneNumber,
          firebaseUid: response.data.firebaseUid,
          idToken, // Pass token to create account after onboarding
        });
      } else {
        // Existing user - login
        console.log('✅ Existing user - logging in');
        await login(response.data);
      }
    } catch (error) {
      console.error('Firebase verification error:', error);
      
      if (error.code === 'auth/invalid-verification-code') {
        showAlert('Error', 'Invalid verification code. Please try again.', 'error');
      } else if (error.code === 'auth/code-expired') {
        showAlert('Error', 'Verification code expired. Please request a new one.', 'error');
      } else {
        showAlert('Error', error.message || 'Verification failed', 'error');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    try {
      setLoading(true);
      
      // Resend verification code via Firebase
      const newConfirmation = await auth().signInWithPhoneNumber(phoneNumber);
      
      // Update the confirmation in route params
      navigation.setParams({ confirmation: newConfirmation });
      
      showAlert('Success', 'OTP has been resent', 'success');
      
      // Clear existing code and refocus
      setCode(['', '', '', '', '', '']);
      setTimeout(() => inputRefs.current?.focus(), 100);
    } catch (error) {
      console.error('Resend error:', error);
      showAlert('Error', error.message || 'Failed to resend OTP', 'error');
    } finally {
      setLoading(false);
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
});

export default PhoneOTPScreen;
