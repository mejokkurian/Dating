import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { signInWithPhoneNumber } from '../../services/api/auth';
import CountryPicker from '../../components/CountryPicker';
import { useNetworkStatus } from '../../hooks/useNetworkStatus';
import * as authAnalytics from '../../services/authAnalytics';

const PhoneNumberScreen = ({ navigation }) => {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [selectedCountry, setSelectedCountry] = useState({
    name: 'India',
    code: 'IN',
    dialCode: '+91',
    flag: '🇮🇳',
  });
  const [loading, setLoading] = useState(false);
  const [phoneError, setPhoneError] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const { isOffline } = useNetworkStatus();
  const inputRef = useRef(null);

  const handleContinue = async () => {
    setPhoneError('');

    if (isOffline) {
      setPhoneError('No internet connection. Please check your network.');
      return;
    }

    const cleanedPhone = phoneNumber.replace(/\D/g, '');
    if (!cleanedPhone || cleanedPhone.length < 7 || cleanedPhone.length > 15) {
      setPhoneError('Please enter a valid phone number');
      return;
    }

    try {
      setLoading(true);
      const formattedPhone = `${selectedCountry.dialCode}${phoneNumber}`;
      await signInWithPhoneNumber(formattedPhone);
      authAnalytics.trackOTPSend(true);
      navigation.navigate('PhoneOTP', { phoneNumber: formattedPhone });
    } catch (error) {
      const errorMessage =
        error.response?.data?.message || 'Failed to send code. Please try again.';
      authAnalytics.trackOTPSend(false, errorMessage);
      setPhoneError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.inner}>
        {/* Title — sits at top */}
        <Text style={styles.title}>What's your{'\n'}phone number?</Text>

        {/* Form — pinned to bottom, just above keyboard */}
        <View style={styles.formSection}>
          <Text style={styles.inputLabel}>PHONE NUMBER</Text>

          <TouchableOpacity
            activeOpacity={1}
            onPress={() => inputRef.current?.focus()}
            style={[styles.inputRow, isFocused && styles.inputRowFocused]}
          >
            <CountryPicker
              selectedCountry={selectedCountry}
              onSelect={setSelectedCountry}
              textColor="#FFFFFF"
            />
            <View style={styles.phoneDivider} />
            <TextInput
              ref={inputRef}
              style={styles.textInput}
              placeholder="Enter your phone number"
              placeholderTextColor="#555555"
              value={phoneNumber}
              onChangeText={(text) => {
                setPhoneNumber(text);
                setPhoneError('');
              }}
              keyboardType="phone-pad"
              autoCapitalize="none"
              autoFocus={true}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
            />
          </TouchableOpacity>

          {phoneError ? (
            <Text style={styles.errorText}>{phoneError}</Text>
          ) : null}

          <TouchableOpacity
            style={[styles.continueButton, (loading || isOffline) && styles.continueButtonDisabled]}
            onPress={handleContinue}
            disabled={loading || isOffline}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.continueButtonText}>Continue</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F0F0F',
  },
  inner: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 80,
    paddingBottom: 32,
    justifyContent: 'space-between',
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: '#FFFFFF',
    lineHeight: 40,
  },
  formSection: {
    gap: 0,
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#777777',
    letterSpacing: 0.8,
    marginBottom: 10,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#2C2C2C',
    borderRadius: 14,
    backgroundColor: '#1C1C1C',
    paddingVertical: 4,
    paddingHorizontal: 4,
  },
  inputRowFocused: {
    borderColor: '#D4AF37',
  },
  phoneDivider: {
    width: 1,
    height: 24,
    backgroundColor: '#333333',
    marginHorizontal: 8,
  },
  textInput: {
    flex: 1,
    fontSize: 16,
    color: '#FFFFFF',
    paddingVertical: 14,
    paddingRight: 12,
  },
  errorText: {
    color: '#FF453A',
    fontSize: 13,
    marginTop: 8,
  },
  continueButton: {
    backgroundColor: '#D4AF37',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 20,
  },
  continueButtonDisabled: {
    opacity: 0.5,
  },
  continueButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default PhoneNumberScreen;
