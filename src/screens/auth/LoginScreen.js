import React, { useState, useRef, useEffect } from "react";
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
  LayoutAnimation,
  UIManager,
} from "react-native";
import { ResponseType } from "expo-auth-session";
import * as Google from "expo-auth-session/providers/google";
import * as AppleAuthentication from "expo-apple-authentication";

if (Platform.OS === "android") {
  if (UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
  }
}
import { LinearGradient } from "expo-linear-gradient";
import { FontAwesome, Ionicons } from "@expo/vector-icons";
import { signInWithPhoneNumber } from '../../services/api/auth';
import {
  signInWithEmail,
  createAccountWithEmail,
  signInWithGoogle,
  signInWithApple,
} from "../../services/api/auth";
import { testConnection } from "../../services/api/config";
import GradientButton from "../../components/GradientButton";
import GlassCard from "../../components/GlassCard";
import RomanticBackground from "../../components/RomanticBackground";
import CustomAlert from "../../components/CustomAlert";
import { useCustomAlert } from "../../hooks/useCustomAlert";
import theme from "../../theme/theme";
import { useAuth } from "../../context/AuthContext";
import CountryPicker from "../../components/CountryPicker";
import { useNetworkStatus } from "../../hooks/useNetworkStatus";
import { sanitizeText } from "../../utils/inputSanitization";
import * as authAnalytics from "../../services/authAnalytics";
import { AUTH_ERROR_MESSAGES, getAuthErrorMessage } from "../../utils/authErrorMessages";

// Client IDs from .env
const GOOGLE_IOS_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID;
const GOOGLE_ANDROID_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID;
const GOOGLE_WEB_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;

const LoginScreen = ({ navigation }) => {
  const [phoneNumber, setPhoneNumber] = useState("");
  const [selectedCountry, setSelectedCountry] = useState({
    name: "United States",
    code: "US",
    dialCode: "+1",
    flag: "🇺🇸",
  });
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const loadingRef = useRef(false); // Persist loading state across navigation
  const [showEmailLogin, setShowEmailLogin] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const { login } = useAuth();
  const { alertConfig, showAlert, hideAlert, handleConfirm } = useCustomAlert();
  const { isOffline } = useNetworkStatus();

  // Validation errors
  const [emailError, setEmailError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [formError, setFormError] = useState("");
  const [phoneError, setPhoneError] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // Rate limiting refs
  const lastAttemptTimeRef = useRef(0);
  const attemptTimestampsRef = useRef([]);
  const AUTH_DEBOUNCE_MS = 500; // 500ms debounce between attempts
  const AUTH_RATE_LIMIT = 5; // Max 5 attempts per minute
  const AUTH_RATE_WINDOW = 60000; // 1 minute window

  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const eyeScale = useRef(new Animated.Value(1)).current;

  // Form animation
  const formAnim = useRef(new Animated.Value(0)).current;

  // Google Login Hook
  const [request, response, promptAsync] = Google.useAuthRequest({
    iosClientId: GOOGLE_IOS_CLIENT_ID,
    androidClientId: GOOGLE_ANDROID_CLIENT_ID,
    webClientId: GOOGLE_WEB_CLIENT_ID,
    // responseType: ResponseType.IdToken, // Removed to default to 'code' for native IDs
  });

  useEffect(() => {
    if (response?.type === "success") {
      // For code flow, we might get authentication object with idToken after internal exchange
      const { authentication } = response;
      const idToken = authentication?.idToken || response.params?.id_token;
      
      if (idToken) {
        handleGoogleLoginSuccess(idToken);
      } else {
        // Should not happen if exchange works
        showAlert("Error", "Could not retrieve Google ID Token", "error");
      }
    } else if (response?.type === "error") {
      showAlert("Error", "Google sign-in failed", "error");
    }
  }, [response]);

  React.useEffect(() => {
    formAnim.setValue(0);
    Animated.spring(formAnim, {
      toValue: 1,
      tension: 50,
      friction: 7,
      useNativeDriver: true,
    }).start();
  }, [showEmailLogin]);

  const toggleEmailLogin = (show) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setShowEmailLogin(show);
  };

  React.useEffect(() => {
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
    
    // Test connection to backend on mount
    if (__DEV__) {
      testConnection().then(isConnected => {
        if (isConnected) {
          console.log('✅ Backend is reachable');
        } else {
          console.warn('⚠️ Backend connection test failed - user may experience login issues');
        }
      });
    }
  }, []);

  // Email validation
  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email) {
      return AUTH_ERROR_MESSAGES.EMAIL_REQUIRED;
    }
    if (!emailRegex.test(email)) {
      return AUTH_ERROR_MESSAGES.EMAIL_INVALID;
    }
    return "";
  };

  // Password validation
  const validatePassword = (password, isSignUp) => {
    if (!password) {
      return "Password is required";
    }
    if (isSignUp && password.length < 6) {
      return "Password must be at least 6 characters";
    }
    return "";
  };

  // Toggle password visibility with animation
  const togglePasswordVisibility = () => {
    // Bounce animation
    Animated.sequence([
      Animated.spring(eyeScale, {
        toValue: 1.3,
        friction: 3,
        tension: 100,
        useNativeDriver: true,
      }),
      Animated.spring(eyeScale, {
        toValue: 1,
        friction: 3,
        tension: 100,
        useNativeDriver: true,
      }),
    ]).start();
    
    setShowPassword(!showPassword);
  };

  // Convert Firebase errors to user-friendly messages
  const getFriendlyErrorMessage = (error) => {
    const errorCode = error.code;

    switch (errorCode) {
      case "auth/email-already-in-use":
        return "This email is already registered. Please sign in instead.";
      case "auth/invalid-email":
        return "Please enter a valid email address.";
      case "auth/user-not-found":
        return "No account found with this email. Please sign up.";
      case "auth/wrong-password":
        return "Incorrect password. Please try again.";
      case "auth/weak-password":
        return "Password is too weak. Use at least 6 characters.";
      case "auth/too-many-requests":
        return "Too many failed attempts. Please try again later.";
      case "auth/network-request-failed":
        return "Network error. Please check your connection.";
      case "auth/invalid-credential":
        return "Invalid email or password. Please try again.";
      default:
        return error.message || "An error occurred. Please try again.";
    }
  };

  const handlePhoneLogin = async () => {
    // Clear previous error
    setPhoneError("");

    if (isOffline) {
      setPhoneError("No internet connection. Please check your network and try again.");
      return;
    }

    // Rate limiting - debounce check
    const now = Date.now();
    const timeSinceLastAttempt = now - lastAttemptTimeRef.current;
    if (timeSinceLastAttempt < AUTH_DEBOUNCE_MS) {
      authAnalytics.trackRateLimitHit('phone_login_debounce');
      setPhoneError("Please wait a moment before trying again.");
      return;
    }

    // Rate limiting - attempts per minute check
    const oneMinuteAgo = now - AUTH_RATE_WINDOW;
    attemptTimestampsRef.current = attemptTimestampsRef.current.filter(timestamp => timestamp > oneMinuteAgo);
    
    if (attemptTimestampsRef.current.length >= AUTH_RATE_LIMIT) {
      authAnalytics.trackRateLimitHit('phone_login_per_minute');
      setPhoneError(`Too many attempts. Please wait a moment before trying again.`);
      return;
    }

    // Update rate limit tracking
    lastAttemptTimeRef.current = now;
    attemptTimestampsRef.current.push(now);

    // Validate phone number format (E.164 format)
    const cleanedPhone = phoneNumber.replace(/\D/g, ''); // Remove non-digits
    if (!cleanedPhone || cleanedPhone.length < 7 || cleanedPhone.length > 15) {
      setPhoneError("Please enter a valid phone number (7-15 digits)");
      return;
    }

    if (!phoneNumber.trim()) {
      setPhoneError("Please enter a valid phone number");
      return;
    }

    try {
      setLoading(true);
      loadingRef.current = true;
      const formattedPhone = `${selectedCountry.dialCode}${phoneNumber}`;
      
      // Use AWS SNS phone authentication
      const response = await signInWithPhoneNumber(formattedPhone);
      
      // Navigate to OTP screen
      navigation.navigate("PhoneOTP", { 
        phoneNumber: formattedPhone
      });
      
      authAnalytics.trackOTPSend(true);
      if (__DEV__) {
        console.log('✅ AWS SNS OTP sent to:', formattedPhone);
      }
    } catch (error) {
      const errorMessage = error.response?.data?.message || "Failed to send verification code. Please try again.";
      authAnalytics.trackOTPSend(false, errorMessage);
      authAnalytics.trackAuthError('phone', errorMessage, error.code);
      if (__DEV__) {
        console.error('Phone auth error:', error);
      }
      setPhoneError(errorMessage);
    } finally {
      setLoading(false);
      loadingRef.current = false;
    }
  };

  const handleEmailLogin = async () => {
    // Clear previous errors
    setEmailError("");
    setPasswordError("");
    setFormError("");

    if (isOffline) {
      setFormError(AUTH_ERROR_MESSAGES.NO_INTERNET);
      return;
    }

    // Rate limiting - debounce check
    const now = Date.now();
    const timeSinceLastAttempt = now - lastAttemptTimeRef.current;
    if (timeSinceLastAttempt < AUTH_DEBOUNCE_MS) {
      authAnalytics.trackRateLimitHit('login_debounce');
      setFormError(AUTH_ERROR_MESSAGES.RATE_LIMIT_DEBOUNCE);
      return;
    }

    // Rate limiting - attempts per minute check
    const oneMinuteAgo = now - AUTH_RATE_WINDOW;
    attemptTimestampsRef.current = attemptTimestampsRef.current.filter(timestamp => timestamp > oneMinuteAgo);
    
    if (attemptTimestampsRef.current.length >= AUTH_RATE_LIMIT) {
      authAnalytics.trackRateLimitHit('login_per_minute');
      setFormError(AUTH_ERROR_MESSAGES.RATE_LIMIT_PER_MINUTE);
      return;
    }

    // Update rate limit tracking
    lastAttemptTimeRef.current = now;
    attemptTimestampsRef.current.push(now);

    // Sanitize inputs
    const sanitizedEmail = sanitizeText(email);
    const sanitizedPassword = password; // Don't sanitize password, but validate it

    // Validate inputs
    const emailErr = validateEmail(sanitizedEmail);
    const passwordErr = validatePassword(sanitizedPassword, isSignUp);

    if (emailErr) {
      setEmailError(emailErr);
      return;
    }
    if (passwordErr) {
      setPasswordError(passwordErr);
      return;
    }

    setLoading(true);
    loadingRef.current = true;
    try {
      let response;
      if (isSignUp) {
        response = await createAccountWithEmail(sanitizedEmail, sanitizedPassword);
        authAnalytics.trackSignupAttempt('email', true);
      } else {
        response = await signInWithEmail(sanitizedEmail, sanitizedPassword);
        authAnalytics.trackLoginAttempt('email', true);
      }

      // Update auth context
      await login(response);
    } catch (error) {
      const errorMessage = error.message || "An error occurred. Please try again.";
      if (isSignUp) {
        authAnalytics.trackSignupAttempt('email', false, errorMessage);
      } else {
        authAnalytics.trackLoginAttempt('email', false, errorMessage);
      }
      authAnalytics.trackAuthError('email', errorMessage, error.code);
      if (__DEV__) {
        console.error("Email login error:", error);
      }
      setFormError(errorMessage);
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

  const handleGoogleLogin = async () => {
    if (__DEV__ && (!GOOGLE_IOS_CLIENT_ID || !GOOGLE_ANDROID_CLIENT_ID)) {
        console.warn('Google Client IDs are missing!');
    }
    try {
        await promptAsync();
    } catch(err) {
        if (__DEV__) {
          console.error("Google prompt error", err);
        }
        showAlert("Error", "Failed to start Google sign in", "error");
    }
  };

  const handleGoogleLoginSuccess = async (idToken) => {
    try {
      setLoading(true);
      loadingRef.current = true;
      const data = await signInWithGoogle({ token: idToken, type: 'login' });
      authAnalytics.trackLoginAttempt('google', true);
      await login(data);
    } catch (error) {
      const errorMessage = error.message || "Google sign-in failed";
      authAnalytics.trackLoginAttempt('google', false, errorMessage);
      authAnalytics.trackAuthError('google', errorMessage, error.code);
      if (error.message && error.message.includes("User not found")) {
         showAlert(
            "Account Not Found", 
            "We couldn't find an account with this Google ID. Redirecting you to sign up...", 
            "info",
            () => navigation.navigate("SignUp")
         );
      } else {
         showAlert("Error", errorMessage, "error");
      }
    } finally {
      setLoading(false);
      loadingRef.current = false;
    }
  };

  const handleAppleLogin = async () => {
    try {
      setLoading(true);
      loadingRef.current = true;
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });
      // credential.identityToken is the JWT string
      // credential.fullName is available only on first sign in
      const data = await signInWithApple({
        token: credential.identityToken, // auth service maps this to identityToken
        fullName: credential.fullName,
        authorizationCode: credential.authorizationCode,
        type: 'login'
      });
      
      authAnalytics.trackLoginAttempt('apple', true);
      await login(data);
    } catch (error) {
      if (error.code === 'ERR_CANCELED') {
        // user canceled
        return;
      }
      const errorMessage = error.message || "Apple sign-in failed";
      authAnalytics.trackLoginAttempt('apple', false, errorMessage);
      authAnalytics.trackAuthError('apple', errorMessage, error.code);
      if (error.message && error.message.includes("User not found")) {
         showAlert(
            "Account Not Found", 
            "We couldn't find an account with this Apple ID. Redirecting you to sign up...", 
            "info",
            () => navigation.navigate("SignUp")
         );
      } else {
         showAlert("Error", errorMessage, "error");
      }
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
        behavior={Platform.OS === "ios" ? "padding" : "height"}
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
                transform: [{ translateY: slideAnim }],
              },
            ]}
          >
            {/* Header */}
            <View style={styles.header}>
              <Text style={styles.title}>Discover Real Connections</Text>
              <Text style={styles.subtitle}>
                {showEmailLogin
                  ? isSignUp
                    ? "Create your account"
                    : "Sign in with email"
                  : "Connect and start matching"}
              </Text>
              {isOffline && (
                <View style={styles.offlineBanner}>
                  <Ionicons name="cloud-offline-outline" size={16} color="#FFFFFF" />
                  <Text style={styles.offlineBannerText}>No Internet Connection</Text>
                </View>
              )}
            </View>

            {!showEmailLogin ? (
              <Animated.View
                style={{
                  opacity: formAnim,
                  transform: [
                    {
                      translateX: formAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [-50, 0],
                      }),
                    },
                  ],
                }}
              >
                {/* Social Login Buttons */}
                <View style={styles.socialSection}>
                  {Platform.OS === "ios" && (
                    <AppleAuthentication.AppleAuthenticationButton
                        buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
                        buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
                        cornerRadius={16}
                        style={{ flex: 1, height: 50 }}
                        onPress={handleAppleLogin}
                    />
                  )}
                  <TouchableOpacity
                    style={styles.socialButton}
                    onPress={handleGoogleLogin}
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

                {/* Phone Number Section */}
                <View style={styles.phoneSection}>
                  <View>
                    <GlassCard
                      style={[
                        styles.inputCard,
                        phoneError && styles.inputCardError,
                      ]}
                      opacity={0.9}
                    >
                      <View style={styles.phoneInputContainer}>
                        <CountryPicker
                          selectedCountry={selectedCountry}
                          onSelect={setSelectedCountry}
                        />
                        <View style={styles.phoneDivider} />
                        <TextInput
                          style={styles.phoneInput}
                          placeholder="Phone Number"
                          placeholderTextColor="#8E8E93"
                          value={phoneNumber}
                          onChangeText={(text) => {
                            setPhoneNumber(text);
                            setPhoneError("");
                          }}
                          keyboardType="phone-pad"
                          autoCapitalize="none"
                        />
                      </View>
                    </GlassCard>
                    {phoneError ? (
                      <View style={styles.phoneErrorContainer}>
                        <Text style={styles.fieldError}>{phoneError}</Text>
                        <TouchableOpacity
                          onPress={() => {
                            setPhoneError("");
                            handlePhoneLogin();
                          }}
                          style={styles.retryButtonSmall}
                        >
                          <Text style={styles.retryButtonTextSmall}>Retry</Text>
                        </TouchableOpacity>
                      </View>
                    ) : null}
                  </View>
                  <TouchableOpacity
                    style={styles.authButton}
                    onPress={handlePhoneLogin}
                    disabled={loading || isOffline}
                    accessibilityLabel="Send verification code"
                    accessibilityHint="Sends a 6-digit verification code to your phone number"
                    accessibilityRole="button"
                    accessibilityState={{ disabled: loading || isOffline }}
                  >
                    {loading ? (
                      <ActivityIndicator color="#FFFFFF" />
                    ) : (
                      <View style={styles.buttonContent}>
                        <Text style={styles.authButtonText}>Send Code</Text>
                        <FontAwesome name="heart" size={16} color="#FFFFFF" />
                      </View>
                    )}
                  </TouchableOpacity>
                </View>

                {/* Email Link */}
                <TouchableOpacity
                  style={styles.textLinkButton}
                  onPress={() => toggleEmailLogin(true)}
                >
                  <Text style={styles.textLink}>Continue with Email</Text>
                </TouchableOpacity>

                {/* Create Account Link */}
                <TouchableOpacity
                  style={styles.textLinkButton}
                  onPress={() => navigation.navigate("SignUp")}
                >
                  <Text style={styles.createAccountText}>
                    Don't have an account?{" "}
                    <Text style={styles.createAccountBold}>Sign Up</Text>
                  </Text>
                </TouchableOpacity>
              </Animated.View>
            ) : (
              <Animated.View
                style={{
                  opacity: formAnim,
                  transform: [
                    {
                      translateX: formAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [50, 0],
                      }),
                    },
                  ],
                }}
              >
                {/* Email Login Form */}
                <View style={styles.emailForm}>
                  {/* Form-level error */}
                  {formError ? (
                    <View style={styles.errorContainer}>
                      <Ionicons name="alert-circle" size={16} color="#FF3B30" />
                      <Text style={styles.errorText}>{formError}</Text>
                      <TouchableOpacity
                        onPress={() => {
                          setFormError("");
                          handleEmailLogin();
                        }}
                        style={styles.retryButton}
                      >
                        <Text style={styles.retryButtonText}>Try Again</Text>
                      </TouchableOpacity>
                    </View>
                  ) : null}

                  {/* Email Input */}
                  <View>
                    <GlassCard
                      style={[
                        styles.inputCard,
                        styles.whiteInputCard,
                        emailError && styles.inputCardError,
                      ]}
                      opacity={1}
                    >
                      <TextInput
                        style={styles.input}
                        placeholder="Email"
                        placeholderTextColor="#8E8E93"
                        value={email}
                        onChangeText={(text) => {
                          setEmail(text);
                          setEmailError("");
                          setFormError("");
                        }}
                        keyboardType="email-address"
                        autoCapitalize="none"
                        autoCorrect={false}
                        accessibilityLabel="Email input"
                        accessibilityHint="Enter your email address"
                        accessibilityRole="textbox"
                      />
                    </GlassCard>
                    {emailError ? (
                      <Text style={styles.fieldError}>{emailError}</Text>
                    ) : null}
                  </View>

                  {/* Password Input */}
                  <View>
                    <GlassCard
                      style={[
                        styles.inputCard,
                        styles.whiteInputCard,
                        passwordError && styles.inputCardError,
                      ]}
                      opacity={1}
                    >
                      <View style={styles.passwordInputContainer}>
                        <TextInput
                          style={[styles.input, styles.passwordInput]}
                          placeholder="Password"
                          placeholderTextColor="#8E8E93"
                          value={password}
                          onChangeText={(text) => {
                            setPassword(text);
                            setPasswordError("");
                            setFormError("");
                          }}
                          secureTextEntry={!showPassword}
                          autoCapitalize="none"
                          accessibilityLabel="Password input"
                          accessibilityHint={showPassword ? "Password is visible" : "Password is hidden"}
                          accessibilityRole="textbox"
                        />
                        <TouchableOpacity
                          style={styles.eyeButton}
                          onPress={togglePasswordVisibility}
                          activeOpacity={0.6}
                          accessibilityLabel={showPassword ? "Hide password" : "Show password"}
                          accessibilityHint="Toggles password visibility"
                          accessibilityRole="button"
                        >
                          <Animated.View
                            style={{
                              transform: [{ scale: eyeScale }],
                            }}
                          >
                            <Ionicons
                              name={showPassword ? "eye-off" : "eye"}
                              size={24}
                              color={showPassword ? "#FF6B9D" : "#D4AF37"}
                            />
                          </Animated.View>
                        </TouchableOpacity>
                      </View>
                    </GlassCard>
                    {passwordError ? (
                      <Text style={styles.fieldError}>{passwordError}</Text>
                    ) : null}
                  </View>

                  <TouchableOpacity
                    style={styles.authButton}
                    onPress={handleEmailLogin}
                    disabled={loading || isOffline}
                    accessibilityLabel={isSignUp ? "Sign up button" : "Sign in button"}
                    accessibilityHint={isSignUp ? "Creates a new account with your email and password" : "Signs in with your email and password"}
                    accessibilityRole="button"
                    accessibilityState={{ disabled: loading || isOffline }}
                  >
                    {loading ? (
                      <ActivityIndicator color="#FFFFFF" />
                    ) : (
                      <Text style={styles.authButtonText}>
                        {isSignUp ? "Sign Up" : "Sign In"}
                      </Text>
                    )}
                  </TouchableOpacity>

                  {/* Toggle Sign Up / Sign In */}
                  <TouchableOpacity
                    style={styles.toggleButton}
                    onPress={() => {
                      if (isSignUp) {
                        setIsSignUp(false);
                      } else {
                        navigation.navigate("SignUp");
                      }
                    }}
                  >
                    <Text style={styles.toggleText}>
                      {isSignUp
                        ? "Already have an account? "
                        : "Don't have an account? "}
                      <Text style={styles.toggleTextAction}>
                        {isSignUp ? "Sign In" : "Sign Up"}
                      </Text>
                    </Text>
                  </TouchableOpacity>

                  {/* Back to main login */}
                  <TouchableOpacity
                    style={styles.backButton}
                    onPress={() => toggleEmailLogin(false)}
                  >
                    <Text style={styles.backText}>← Back to other options</Text>
                  </TouchableOpacity>
                </View>
              </Animated.View>
            )}

            {/* Footer */}
            <Text style={styles.footer}>
              By continuing, you agree to our{" "}
              <Text style={styles.linkText}>Terms of Service</Text> and{" "}
              <Text style={styles.linkText}>Privacy Policy</Text>
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
    justifyContent: "center",
    minHeight: "100%",
  },
  content: {
    width: "100%",
  },
  header: {
    alignItems: "center",
    marginBottom: theme.spacing["3xl"],
  },
  title: {
    fontSize: theme.typography.fontSize["4xl"],
    fontWeight: theme.typography.fontWeight.extraBold,
    color: "#000000",
    marginBottom: theme.spacing.xs,
    textAlign: "center",
    lineHeight: 42,
    paddingHorizontal: 20,
  },
  subtitle: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.text.secondary,
    opacity: 0.8,
    textAlign: "center",
  },

  // Social Section
  socialSection: {
    flexDirection: "row",
    gap: theme.spacing.md,
    marginBottom: theme.spacing["2xl"], // Increased spacing
    marginTop: theme.spacing.lg,
  },
  appleButton: {
    borderRadius: 30,
    overflow: "hidden",
    ...theme.shadows.lg,
  },
  socialButton: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    paddingVertical: 16,
    borderWidth: 1,
    borderColor: "rgba(0, 0, 0, 0.1)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  socialButtonContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  socialButtonText: {
    fontSize: theme.typography.fontSize.base,
    fontWeight: theme.typography.fontWeight.semiBold,
    color: "#000000",
  },

  // Divider
  divider: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: theme.spacing["2xl"], // Increased spacing
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: "rgba(0, 0, 0, 0.1)",
  },
  dividerText: {
    color: theme.colors.text.tertiary,
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.medium,
    marginHorizontal: theme.spacing.md,
    opacity: 0.8,
  },

  // Phone Section
  phoneSection: {
    gap: theme.spacing.md,
    marginBottom: theme.spacing["3xl"], // Increased spacing
  },
  inputCard: {
    padding: 0,
  },
  whiteInputCard: {
    backgroundColor: "#FFFFFF",
  },
  input: {
    padding: theme.spacing.lg,
    fontSize: theme.typography.fontSize.base,
    color: "#000000",
    fontWeight: theme.typography.fontWeight.medium,
  },
  phoneButton: {
    width: "100%",
  },
  phoneInputContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  phoneDivider: {
    width: 1,
    height: 24,
    backgroundColor: "rgba(0, 0, 0, 0.2)",
    marginHorizontal: 8,
  },
  phoneInput: {
    flex: 1,
    padding: theme.spacing.lg,
    fontSize: theme.typography.fontSize.base,
    color: "#000000",
    fontWeight: theme.typography.fontWeight.medium,
  },

  // Text Links
  textLinkButton: {
    alignItems: "center",
    paddingVertical: theme.spacing.sm,
    marginTop: theme.spacing.md, // Added spacing between links
  },
  textLink: {
    color: theme.colors.text.secondary,
    fontSize: 15,
    fontWeight: "600",
  },
  createAccountText: {
    color: theme.colors.text.secondary,
    fontSize: 14,
    opacity: 0.8,
  },
  createAccountBold: {
    color: "#D4AF37",
    fontWeight: "700",
  },

  // Email Form
  emailForm: {
    gap: theme.spacing.md,
  },
  authButton: {
    backgroundColor: "#D4AF37",
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    marginTop: theme.spacing.md,
    shadowColor: "#D4AF37",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  authButtonText: {
    color: "#000000",
    fontSize: 16,
    fontWeight: "700",
  },
  buttonContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  emailButton: {
    marginTop: theme.spacing.md,
  },
  toggleButton: {
    alignItems: "center",
    paddingVertical: theme.spacing.sm,
  },
  toggleText: {
    color: "#D4AF37",
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.medium,
  },
  toggleTextAction: {
    textDecorationLine: "underline",
    fontWeight: "700",
  },
  backButton: {
    alignItems: "center",
    paddingVertical: theme.spacing.md,
    marginTop: theme.spacing.md,
  },
  backText: {
    color: theme.colors.text.primary,
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.medium,
  },

  // Footer
  footer: {
    marginTop: theme.spacing["3xl"],
    textAlign: "center",
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.text.tertiary,
    opacity: 0.9,
    paddingHorizontal: theme.spacing.lg,
  },
  linkText: {
    color: "#D4AF37",
    textDecorationLine: "underline",
  },

  // Error styles
  errorContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 59, 48, 0.1)",
    borderWidth: 1,
    borderColor: "rgba(255, 59, 48, 0.3)",
    borderRadius: 12,
    padding: 12,
    gap: 8,
    marginBottom: 16,
  },
  errorText: {
    flex: 1,
    color: "#FF3B30",
    fontSize: 14,
    fontWeight: "500",
  },
  fieldError: {
    color: "#FF3B30",
    fontSize: 12,
    marginTop: 6,
    marginLeft: 4,
  },
  inputCardError: {
    borderWidth: 1,
    borderColor: "rgba(255, 59, 48, 0.5)",
  },
  passwordInputContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  passwordInput: {
    flex: 1,
    paddingRight: 50,
  },
  eyeButton: {
    position: "absolute",
    right: 16,
    padding: 8,
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
  phoneErrorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  retryButton: {
    marginTop: 8,
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: '#D4AF37',
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  retryButtonText: {
    color: '#000000',
    fontSize: 14,
    fontWeight: '600',
  },
  retryButtonSmall: {
    paddingVertical: 4,
    paddingHorizontal: 12,
    backgroundColor: '#D4AF37',
    borderRadius: 6,
    marginLeft: 8,
  },
  retryButtonTextSmall: {
    color: '#000000',
    fontSize: 12,
    fontWeight: '600',
  },
});

export default LoginScreen;
