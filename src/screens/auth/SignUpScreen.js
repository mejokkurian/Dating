import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Animated,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { FontAwesome, Ionicons } from '@expo/vector-icons';
import {
  signInWithEmail,
  createAccountWithEmail,
  signInWithGoogle,
  signInWithApple,
} from '../../services/api/auth';
import * as Google from 'expo-auth-session/providers/google';
import * as AppleAuthentication from 'expo-apple-authentication';
import { ResponseType } from 'expo-auth-session';
import GradientButton from '../../components/GradientButton';
import GlassCard from '../../components/GlassCard';
import RomanticBackground from '../../components/RomanticBackground';
import CustomAlert from '../../components/CustomAlert';
import { useCustomAlert } from '../../hooks/useCustomAlert';
import theme from '../../theme/theme';
import { useAuth } from '../../context/AuthContext';

// Client IDs from .env
const GOOGLE_IOS_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID;
const GOOGLE_ANDROID_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID;
const GOOGLE_WEB_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;

const SignUpScreen = ({ navigation }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const { alertConfig, showAlert, hideAlert, handleConfirm } = useCustomAlert();

  // Validation errors
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [formError, setFormError] = useState('');

  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(-50)).current;

  // Google Login Hook
  const [request, response, promptAsync] = Google.useAuthRequest({
    iosClientId: GOOGLE_IOS_CLIENT_ID,
    androidClientId: GOOGLE_ANDROID_CLIENT_ID,
    webClientId: GOOGLE_WEB_CLIENT_ID,
    responseType: ResponseType.IdToken,
  });

  React.useEffect(() => {
    if (response?.type === "success") {
      const { id_token } = response.params;
      handleGoogleSignUpSuccess(id_token);
    } else if (response?.type === "error") {
      showAlert("Error", "Google sign-up failed", "error");
    }
  }, [response]);

  React.useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 50,
        friction: 8,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  // Email validation
  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email) {
      return 'Email is required';
    }
    if (!emailRegex.test(email)) {
      return 'Please enter a valid email address';
    }
    return '';
  };

  // Password validation
  const validatePassword = (password) => {
    if (!password) {
      return 'Password is required';
    }
    if (password.length < 6) {
      return 'Password must be at least 6 characters';
    }
    return '';
  };

  // Convert Firebase errors to user-friendly messages
  const getFriendlyErrorMessage = (error) => {
    const errorCode = error.code;
    
    switch (errorCode) {
      case 'auth/email-already-in-use':
        return 'This email is already registered. Please sign in instead.';
      case 'auth/invalid-email':
        return 'Please enter a valid email address.';
      case 'auth/weak-password':
        return 'Password is too weak. Use at least 6 characters.';
      case 'auth/too-many-requests':
        return 'Too many failed attempts. Please try again later.';
      case 'auth/network-request-failed':
        return 'Network error. Please check your connection.';
      default:
        return error.message || 'An error occurred. Please try again.';
    }
  };

  const handleSignUp = async () => {
    // Clear previous errors
    setEmailError('');
    setPasswordError('');
    setFormError('');

    // Validate inputs
    const emailErr = validateEmail(email);
    const passwordErr = validatePassword(password);

    if (emailErr) {
      setEmailError(emailErr);
      return;
    }
    if (passwordErr) {
      setPasswordError(passwordErr);
      return;
    }

    setLoading(true);
    try {
      const response = await createAccountWithEmail(email, password);
      
      // Update auth context
      await login(response);
      
    } catch (error) {
      console.error('Sign up error:', error);
      // API errors usually come as { message: '...' }
      const errorMessage = error.message || 'An error occurred. Please try again.';
      setFormError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignUp = async () => {
    if (!GOOGLE_IOS_CLIENT_ID || !GOOGLE_ANDROID_CLIENT_ID) {
        console.warn('Google Client IDs are missing!');
    }
    try {
        await promptAsync();
    } catch(err) {
        console.error("Google prompt error", err);
        showAlert("Error", "Failed to start Google sign up", "error");
    }
  };

  const handleGoogleSignUpSuccess = async (idToken) => {
    try {
      setLoading(true);
      const data = await signInWithGoogle({ token: idToken, type: 'register' });
      await login(data);
    } catch (error) {
      if (error.message && error.message.includes("User already exists")) {
         showAlert(
            "Account Exists", 
            "You already have an account. Redirecting you to login...", 
            "info",
            () => navigation.navigate("Login")
         );
      } else {
         showAlert('Error', error.message || 'Google sign-up failed', 'error');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleAppleSignUp = async () => {
    try {
      setLoading(true);
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });
      
      const data = await signInWithApple({
        token: credential.identityToken,
        fullName: credential.fullName,
        authorizationCode: credential.authorizationCode,
        type: 'register'
      });

      await login(data);
    } catch (error) {
      if (error.code === 'ERR_CANCELED') {
        return;
      }
      if (error.message && error.message.includes("User already exists")) {
         showAlert(
            "Account Exists", 
            "You already have an account. Redirecting you to login...", 
            "info",
            () => navigation.navigate("Login")
         );
      } else {
         showAlert('Error', error.message || 'Apple sign-up failed', 'error');
      }
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
        <ScrollView 
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <Animated.View
            style={[
              styles.content,
              {
                opacity: fadeAnim,
                transform: [{ translateX: slideAnim }],
              },
            ]}
          >
            {/* Header */}
            <View style={styles.header}>
              <TouchableOpacity
                style={styles.backButton}
                onPress={() => navigation.goBack()}
              >
                <Ionicons name="arrow-back" size={24} color="#000" />
              </TouchableOpacity>
              <Text style={styles.title}>Create Account</Text>
              <Text style={styles.subtitle}>
                Join us and start your journey
              </Text>
            </View>

            {/* Social Sign Up Buttons */}
            <View style={styles.socialSection}>
              {Platform.OS === 'ios' && (
                <AppleAuthentication.AppleAuthenticationButton
                    buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_UP}
                    buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
                    cornerRadius={16}
                    style={{ flex: 1, height: 50 }}
                    onPress={handleAppleSignUp}
                />
              )}
              <TouchableOpacity
                style={styles.socialButton}
                onPress={handleGoogleSignUp}
                disabled={!request || loading}
              >
                <View style={styles.socialButtonContent}>
                  <FontAwesome name="google" size={18} color="#DB4437" />
                  <Text style={styles.socialButtonText}>Google</Text>
                </View>
              </TouchableOpacity>
            </View>

            {/* Divider */}
            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>or</Text>
              <View style={styles.dividerLine} />
            </View>

            {/* Email Sign Up Form */}
            <View style={styles.emailForm}>
              {/* Form-level error */}
              {formError ? (
                <View style={styles.errorContainer}>
                  <Ionicons name="alert-circle" size={16} color="#FF3B30" />
                  <Text style={styles.errorText}>{formError}</Text>
                </View>
              ) : null}

              {/* Email Input */}
              <View>
                <GlassCard style={[styles.inputCard, styles.whiteInputCard, emailError && styles.inputCardError]} opacity={1}>
                  <TextInput
                    style={styles.input}
                    placeholder="Email"
                    placeholderTextColor="#8E8E93"
                    value={email}
                    onChangeText={(text) => {
                      setEmail(text);
                      setEmailError('');
                      setFormError('');
                    }}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                </GlassCard>
                {emailError ? (
                  <Text style={styles.fieldError}>{emailError}</Text>
                ) : null}
              </View>

              {/* Password Input */}
              <View>
                <GlassCard style={[styles.inputCard, styles.whiteInputCard, passwordError && styles.inputCardError]} opacity={1}>
                  <TextInput
                    style={styles.input}
                    placeholder="Password"
                    placeholderTextColor="#8E8E93"
                    value={password}
                    onChangeText={(text) => {
                      setPassword(text);
                      setPasswordError('');
                      setFormError('');
                    }}
                    secureTextEntry
                    autoCapitalize="none"
                  />
                </GlassCard>
                {passwordError ? (
                  <Text style={styles.fieldError}>{passwordError}</Text>
                ) : null}
              </View>

              <TouchableOpacity
                style={styles.authButton}
                onPress={handleSignUp}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <View style={styles.buttonContent}>
                    <Text style={styles.authButtonText}>Sign Up</Text>
                    <FontAwesome name="heart" size={16} color="#FFFFFF" />
                  </View>
                )}
              </TouchableOpacity>
              
              {/* Sign In Link */}
              <TouchableOpacity
                style={styles.toggleButton}
                onPress={() => navigation.navigate('Login')}
              >
                <Text style={styles.toggleText}>
                  Already have an account?{' '}
                  <Text style={styles.toggleTextAction}>Sign In</Text>
                </Text>
              </TouchableOpacity>
            </View>

            {/* Footer */}
            <Text style={styles.footer}>
              By continuing, you agree to our <Text style={styles.linkText}>Terms of Service</Text> and <Text style={styles.linkText}>Privacy Policy</Text>
            </Text>
          </Animated.View>
        </ScrollView>
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
  },
  scrollContent: {
    flexGrow: 1,
    padding: theme.spacing.lg,
    justifyContent: 'center',
    minHeight: '100%',
  },
  content: {
    width: '100%',
  },
  header: {
    alignItems: 'center',
    marginBottom: theme.spacing['3xl'],
  },
  backButton: {
    position: 'absolute',
    left: 0,
    top: 0,
    padding: 8,
    zIndex: 10,
  },
  title: {
    fontSize: theme.typography.fontSize['5xl'],
    fontWeight: theme.typography.fontWeight.extraBold,
    color: '#000000',
    marginBottom: theme.spacing.xs,
    textAlign: 'center',
    marginTop: 40,
  },
  subtitle: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.text.secondary,
    opacity: 0.8,
    textAlign: 'center',
  },
  
  // Social Section
  socialSection: {
    flexDirection: 'row',
    gap: theme.spacing.md,
    marginBottom: theme.spacing.xl,
  },
  socialButton: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingVertical: 16,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.1)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  socialButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  socialButtonText: {
    fontSize: theme.typography.fontSize.base,
    fontWeight: theme.typography.fontWeight.semiBold,
    color: '#000000',
  },
  
  // Divider
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: theme.spacing.xl,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
  },
  dividerText: {
    color: theme.colors.text.tertiary,
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.medium,
    marginHorizontal: theme.spacing.md,
    opacity: 0.8,
  },
  
  // Email Form
  emailForm: {
    gap: theme.spacing.md,
  },
  inputCard: {
    padding: 0,
  },
  whiteInputCard: {
    backgroundColor: '#FFFFFF',
  },
  input: {
    padding: theme.spacing.lg,
    fontSize: theme.typography.fontSize.base,
    color: '#000000',
    fontWeight: theme.typography.fontWeight.medium,
  },
  authButton: {
    backgroundColor: '#D4AF37',
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: theme.spacing.md,
    shadowColor: '#D4AF37',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  authButtonText: {
    color: '#000000',
    fontSize: 16,
    fontWeight: '700',
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  toggleButton: {
    alignItems: 'center',
    paddingVertical: theme.spacing.sm,
  },
  toggleText: {
    color: '#D4AF37',
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.medium,
  },
  toggleTextAction: {
    textDecorationLine: 'underline',
    fontWeight: '700',
  },
  
  // Footer
  footer: {
    marginTop: theme.spacing['3xl'],
    textAlign: 'center',
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.text.tertiary,
    opacity: 0.9,
    paddingHorizontal: theme.spacing.lg,
  },
  linkText: {
    color: '#D4AF37',
    textDecorationLine: 'underline',
  },

  // Error styles
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 59, 48, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 59, 48, 0.3)',
    borderRadius: 12,
    padding: 12,
    gap: 8,
    marginBottom: 16,
  },
  errorText: {
    flex: 1,
    color: '#FF3B30',
    fontSize: 14,
    fontWeight: '500',
  },
  fieldError: {
    color: '#FF3B30',
    fontSize: 12,
    marginTop: 6,
    marginLeft: 4,
  },
  inputCardError: {
    borderWidth: 1,
    borderColor: 'rgba(255, 59, 48, 0.5)',
  },
});

export default SignUpScreen;





