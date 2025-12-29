import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  SafeAreaView,
  TextInput,
  Keyboard,
  TouchableWithoutFeedback,
  KeyboardAvoidingView,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { FontAwesome, Ionicons } from '@expo/vector-icons';
import GlassCard from '../../components/GlassCard';
import CustomAlert from '../../components/CustomAlert';
import { useCustomAlert } from '../../hooks/useCustomAlert';
import theme from '../../theme/theme';
import { LinearGradient } from 'expo-linear-gradient';

import { useAuth } from '../../context/AuthContext';
import { createUserDocument } from '../../services/api/user';

const AgeVerificationScreen = ({ navigation }) => {
  const { user, logout } = useAuth();
  const [date, setDate] = useState(new Date(new Date().setFullYear(new Date().getFullYear() - 18)));
  const [loading, setLoading] = useState(false);
  const { alertConfig, showAlert, hideAlert, handleConfirm } = useCustomAlert();

  const handleBack = () => {
    if (navigation.canGoBack()) {
      navigation.goBack();
    } else {
      showAlert(
        'Logout',
        'Do you want to logout and return to the login screen?',
        'warning',
        logout
      );
    }
  };

  const calculateAge = (birthDate) => {
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  const onChange = (event, selectedDate) => {
    const currentDate = selectedDate || date;
    setDate(currentDate);
  };

  const verifyAge = () => {
    const age = calculateAge(date);
    
    if (age < 18) {
      showAlert(
        'Age Verification Failed',
        'You must be at least 18 years old to use this app.',
        'error'
      );
      return false;
    }
    
    return true;
  };

  const handleContinue = async () => {
    if (!verifyAge()) {
      return;
    }

    try {
      setLoading(true);
      const age = calculateAge(date);
      
      // Save age and birthDate to Firestore immediately
      // Note: createUserDocument in new API ignores the first ID argument and uses the token
      await createUserDocument(user._id, {
        age: age,
        birthDate: date.toISOString(),
      });

      // Navigate to onboarding with age pre-filled
      navigation.navigate('Onboarding', { age, birthDate: date });
    } catch (error) {
      console.error('Error saving age verification:', error);
      showAlert('Error', 'Failed to save verification. Please try again.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const age = calculateAge(date);
  const isEligible = age >= 18;

  return (
    <LinearGradient
      colors={['#FFFFFF', '#F8F9FA']} // Light Premium Background
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.gradient}
    >
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <SafeAreaView style={styles.container}>
            <View style={styles.content}>
              <TouchableOpacity 
                style={styles.backButton} 
                onPress={handleBack}
              >
                <Ionicons name="arrow-back" size={24} color="#000000" />
              </TouchableOpacity>

              <View style={styles.header}>
                <View style={styles.iconContainer}>
                  <Ionicons name="shield-checkmark" size={48} color="#D4AF37" />
                </View>
                <Text style={styles.title}>Age Verification</Text>
                <Text style={styles.subtitle}>
                  Please confirm your date of birth
                </Text>
              </View>

              <View style={styles.formContainer}>
                <View style={styles.datePickerContainer}>
                  <DateTimePicker
                    testID="dateTimePicker"
                    value={date}
                    mode="date"
                    display="spinner"
                    onChange={onChange}
                    textColor="#000000"
                    themeVariant="light"
                    maximumDate={new Date()}
                    style={styles.datePicker}
                  />
                </View>

                <View style={styles.ageContainer}>
                  <Text style={styles.ageLabel}>You are</Text>
                  <Text style={[styles.ageValue, !isEligible && styles.ageInvalid]}>
                    {age}
                  </Text>
                  <Text style={styles.ageLabel}>years old</Text>
                </View>
              </View>

              <View style={styles.footer}>
                <Text style={styles.disclaimer}>
                  You must be 18+ to use this app.
                </Text>
                
                <TouchableOpacity
                  style={[
                    styles.continueButton, 
                    !isEligible && styles.buttonDisabled
                  ]}
                  onPress={handleContinue}
                  disabled={!isEligible}
                >
                  <Text style={styles.continueButtonText}>Confirm & Continue</Text>
                </TouchableOpacity>
              </View>
            </View>
          </SafeAreaView>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
      
      <CustomAlert
        visible={alertConfig.visible}
        title={alertConfig.title}
        message={alertConfig.message}
        type={alertConfig.type}
        onClose={hideAlert}
        onConfirm={handleConfirm}
      />
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  gradient: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    padding: 32,
    justifyContent: 'space-between',
  },
  backButton: {
    padding: 8,
    alignSelf: 'flex-start',
    marginLeft: -8,
  },
  header: {
    alignItems: 'center',
    marginTop: 10,
  },
  iconContainer: {
    marginBottom: 24,
    shadowColor: '#D4AF37',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: '300', // Light font for elegance
    color: '#000000',
    marginBottom: 8,
    textAlign: 'center',
    letterSpacing: 1,
  },
  subtitle: {
    fontSize: 16,
    color: theme.colors.text.secondary,
    textAlign: 'center',
    fontWeight: '300',
  },
  formContainer: {
    marginTop: 40,
    marginBottom: 40,
  },
  datePickerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 200,
    overflow: 'hidden',
  },
  datePicker: {
    height: 200,
    width: '100%',
  },
  ageContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'center',
    gap: 8,
    marginTop: 48,
  },
  ageLabel: {
    fontSize: 18,
    color: theme.colors.text.secondary,
    fontWeight: '300',
  },
  ageValue: {
    fontSize: 36,
    fontWeight: '600',
    color: '#D4AF37',
  },
  ageInvalid: {
    color: '#FF453A',
  },
  footer: {
    marginBottom: 20,
  },
  disclaimer: {
    fontSize: 14,
    color: theme.colors.text.secondary,
    textAlign: 'center',
    marginBottom: 32,
    fontWeight: '500',
    opacity: 0.9,
  },
  continueButton: {
    backgroundColor: '#D4AF37',
    paddingVertical: 18,
    borderRadius: 30, // Pill shape
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    shadowColor: '#FFFFFF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
  },
  buttonDisabled: {
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
    opacity: 0.5,
  },
  continueButtonText: {
    color: '#000000',
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 1,
  },
});

export default AgeVerificationScreen;
