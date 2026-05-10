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
import {
  AUTH_ERROR_MESSAGES,
  getAuthErrorMessage,
} from "../../utils/authErrorMessages";
import { useTheme } from "../../context/ThemeContext";

// Client IDs from .env
const GOOGLE_IOS_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID;
const GOOGLE_ANDROID_CLIENT_ID =
  process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID;
const GOOGLE_WEB_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;

const LoginScreen = ({ navigation }) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const loadingRef = useRef(false); // Persist loading state across navigation
  const [showEmailLogin, setShowEmailLogin] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const { login } = useAuth();
  const { alertConfig, showAlert, hideAlert, handleConfirm } = useCustomAlert();
  const { isOffline } = useNetworkStatus();
  const { colors, isDark } = useTheme();

  // Validation errors
  const [emailError, setEmailError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [formError, setFormError] = useState("");
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

  const styles = makeStyles(colors);

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
      testConnection().then((isConnected) => {
        if (isConnected) {
          console.log("✅ Backend is reachable");
        } else {
          console.warn(
            "⚠️ Backend connection test failed - user may experience login issues",
          );
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
      authAnalytics.trackRateLimitHit("login_debounce");
      setFormError(AUTH_ERROR_MESSAGES.RATE_LIMIT_DEBOUNCE);
      return;
    }

    // Rate limiting - attempts per minute check
    const oneMinuteAgo = now - AUTH_RATE_WINDOW;
    attemptTimestampsRef.current = attemptTimestampsRef.current.filter(
      (timestamp) => timestamp > oneMinuteAgo,
    );

    if (attemptTimestampsRef.current.length >= AUTH_RATE_LIMIT) {
      authAnalytics.trackRateLimitHit("login_per_minute");
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
        response = await createAccountWithEmail(
          sanitizedEmail,
          sanitizedPassword,
        );
        authAnalytics.trackSignupAttempt("email", true);
      } else {
        response = await signInWithEmail(sanitizedEmail, sanitizedPassword);
        authAnalytics.trackLoginAttempt("email", true);
      }

      // Update auth context
      await login(response);
    } catch (error) {
      const errorMessage =
        error.message || "An error occurred. Please try again.";
      if (isSignUp) {
        authAnalytics.trackSignupAttempt("email", false, errorMessage);
      } else {
        authAnalytics.trackLoginAttempt("email", false, errorMessage);
      }
      authAnalytics.trackAuthError("email", errorMessage, error.code);
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
      console.warn("Google Client IDs are missing!");
    }
    try {
      await promptAsync();
    } catch (err) {
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
      const data = await signInWithGoogle({ token: idToken, type: "login" });
      authAnalytics.trackLoginAttempt("google", true);
      await login(data);
    } catch (error) {
      const errorMessage = error.message || "Google sign-in failed";
      authAnalytics.trackLoginAttempt("google", false, errorMessage);
      authAnalytics.trackAuthError("google", errorMessage, error.code);
      if (error.message && error.message.includes("User not found")) {
        showAlert(
          "Account Not Found",
          "We couldn't find an account with this Google ID. Redirecting you to sign up...",
          "info",
          () => navigation.navigate("SignUp"),
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
        type: "login",
      });

      authAnalytics.trackLoginAttempt("apple", true);
      await login(data);
    } catch (error) {
      if (error.code === "ERR_CANCELED") {
        // user canceled
        return;
      }
      const errorMessage = error.message || "Apple sign-in failed";
      authAnalytics.trackLoginAttempt("apple", false, errorMessage);
      authAnalytics.trackAuthError("apple", errorMessage, error.code);
      if (error.message && error.message.includes("User not found")) {
        showAlert(
          "Account Not Found",
          "We couldn't find an account with this Apple ID. Redirecting you to sign up...",
          "info",
          () => navigation.navigate("SignUp"),
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
              {/* Brand Logo */}
              {/* <View style={styles.logoContainer}>
                <LinearGradient
                  colors={["#F5C842", "#D4AF37", "#B8860B"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.logoGradient}
                >
                  <FontAwesome name="diamond" size={26} color="#0D0D0D" />
                </LinearGradient>
                <Text style={styles.brandName}>EMPER</Text>
              </View> */}

              <Text style={styles.title}>Discover Real{"\n"}Connections</Text>
              <Text style={styles.subtitle}>
                {showEmailLogin
                  ? isSignUp
                    ? "Create your account"
                    : "Sign in with email"
                  : "Connect and start matching"}
              </Text>
              {isOffline && (
                <View style={styles.offlineBanner}>
                  <Ionicons
                    name="cloud-offline-outline"
                    size={16}
                    color="#FFFFFF"
                  />
                  <Text style={styles.offlineBannerText}>
                    No Internet Connection
                  </Text>
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
                {/* Social Login Buttons — column layout */}
                <View style={styles.socialSection}>
                  {Platform.OS === "ios" && (
                    <View style={styles.appleButtonWrapper}>
                      <AppleAuthentication.AppleAuthenticationButton
                        buttonType={
                          AppleAuthentication.AppleAuthenticationButtonType
                            .SIGN_IN
                        }
                        buttonStyle={
                          AppleAuthentication.AppleAuthenticationButtonStyle
                            .BLACK
                        }
                        cornerRadius={14}
                        style={{ width: "100%", height: 54 }}
                        onPress={handleAppleLogin}
                      />
                    </View>
                  )}

                  <TouchableOpacity
                    style={styles.socialButton}
                    onPress={handleGoogleLogin}
                    disabled={!request || loading}
                    activeOpacity={0.8}
                  >
                    <View style={styles.socialButtonContent}>
                      <FontAwesome name="google" size={18} color="#DB4437" />
                      <Text style={styles.socialButtonText}>
                        Continue with Google
                      </Text>
                    </View>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.socialButton}
                    onPress={() => navigation.navigate("PhoneNumber")}
                    activeOpacity={0.8}
                  >
                    <View style={styles.socialButtonContent}>
                      <Ionicons
                        name="call-outline"
                        size={18}
                        color={colors.text.primary}
                      />
                      <Text style={styles.socialButtonText}>
                        Continue with Phone
                      </Text>
                    </View>
                  </TouchableOpacity>
                </View>

                {/* Divider */}
                <View style={styles.divider}>
                  <View style={styles.dividerLine} />
                  <Text style={styles.dividerText}>or</Text>
                  <View style={styles.dividerLine} />
                </View>

                {/* Email Ghost Button */}
                <TouchableOpacity
                  style={styles.emailOutlineButton}
                  onPress={() => toggleEmailLogin(true)}
                  activeOpacity={0.8}
                >
                  <Ionicons
                    name="mail-outline"
                    size={18}
                    color={colors.accent}
                  />
                  <Text style={styles.emailOutlineText}>
                    Continue with Email
                  </Text>
                </TouchableOpacity>

                {/* Create Account Link */}
                <TouchableOpacity
                  style={styles.signUpRow}
                  onPress={() => navigation.navigate("SignUp")}
                >
                  <Text style={styles.createAccountText}>
                    New here?{" "}
                    <Text style={styles.createAccountBold}>
                      Create an account
                    </Text>
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
                          placeholderTextColor={colors.placeholder}
                          value={password}
                          onChangeText={(text) => {
                            setPassword(text);
                            setPasswordError("");
                            setFormError("");
                          }}
                          secureTextEntry={!showPassword}
                          autoCapitalize="none"
                          accessibilityLabel="Password input"
                          accessibilityHint={
                            showPassword
                              ? "Password is visible"
                              : "Password is hidden"
                          }
                          accessibilityRole="textbox"
                        />
                        <TouchableOpacity
                          style={styles.eyeButton}
                          onPress={togglePasswordVisibility}
                          activeOpacity={0.6}
                          accessibilityLabel={
                            showPassword ? "Hide password" : "Show password"
                          }
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
                              color={showPassword ? "#FF6B9D" : colors.accent}
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
                    accessibilityLabel={
                      isSignUp ? "Sign up button" : "Sign in button"
                    }
                    accessibilityHint={
                      isSignUp
                        ? "Creates a new account with your email and password"
                        : "Signs in with your email and password"
                    }
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

const makeStyles = (colors) =>
  StyleSheet.create({
    gradient: { flex: 1 },
    container: { flex: 1 },
    scrollContent: {
      flexGrow: 1,
      paddingHorizontal: 28,
      paddingVertical: 40,
      justifyContent: "center",
      minHeight: "100%",
    },
    content: { width: "100%" },

    // Header & Logo
    header: {
      alignItems: "center",
      marginBottom: 32,
    },
    logoContainer: {
      alignItems: "center",
      marginBottom: 24,
    },
    logoGradient: {
      width: 64,
      height: 64,
      borderRadius: 20,
      alignItems: "center",
      justifyContent: "center",
      shadowColor: "#D4AF37",
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.55,
      shadowRadius: 14,
      elevation: 12,
      marginBottom: 10,
    },
    brandName: {
      fontSize: 12,
      fontWeight: "800",
      color: colors.accent,
      letterSpacing: 6,
    },
    title: {
      fontSize: 34,
      fontWeight: "800",
      color: colors.text.primary,
      marginBottom: 8,
      textAlign: "center",
      lineHeight: 40,
    },
    subtitle: {
      fontSize: 14,
      color: colors.text.secondary,
      textAlign: "center",
      letterSpacing: 0.3,
    },

    // Social Section
    socialSection: {
      flexDirection: "column",
      gap: 12,
      marginBottom: 20,
      marginTop: 8,
    },
    appleButtonWrapper: {
      width: "100%",
      borderRadius: 14,
      overflow: "hidden",
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.25,
      shadowRadius: 8,
      elevation: 5,
    },
    socialButton: {
      width: "100%",
      backgroundColor: colors.card,
      borderRadius: 14,
      paddingVertical: 17,
      borderWidth: 1,
      borderColor: "rgba(212, 175, 55, 0.25)",
      shadowColor: "#D4AF37",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.12,
      shadowRadius: 6,
      elevation: 3,
    },
    socialButtonContent: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 12,
    },
    socialButtonText: {
      fontSize: 15,
      fontWeight: "600",
      color: colors.text.primary,
      letterSpacing: 0.2,
    },

    // Divider
    divider: {
      flexDirection: "row",
      alignItems: "center",
      marginVertical: 16,
    },
    dividerLine: {
      flex: 1,
      height: StyleSheet.hairlineWidth,
      backgroundColor: "rgba(212, 175, 55, 0.3)",
    },
    dividerText: {
      color: colors.text.tertiary,
      fontSize: 11,
      fontWeight: "600",
      marginHorizontal: 14,
      letterSpacing: 1.5,
      textTransform: "uppercase",
    },

    // Email Ghost Button
    emailOutlineButton: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 10,
      borderWidth: 1.5,
      borderColor: colors.accent,
      borderRadius: 14,
      paddingVertical: 15,
      backgroundColor: "transparent",
    },
    emailOutlineText: {
      fontSize: 15,
      fontWeight: "600",
      color: colors.accent,
      letterSpacing: 0.2,
    },

    // Sign Up Row
    signUpRow: {
      alignItems: "center",
      paddingVertical: 14,
      marginTop: 4,
    },
    createAccountText: {
      color: colors.text.secondary,
      fontSize: 14,
    },
    createAccountBold: {
      color: colors.accent,
      fontWeight: "700",
    },

    // Text Links (kept for email form back button etc.)
    textLinkButton: {
      alignItems: "center",
      paddingVertical: theme.spacing.sm,
      marginTop: theme.spacing.md,
    },
    textLink: {
      color: colors.text.secondary,
      fontSize: 15,
      fontWeight: "600",
    },

    // Email Form
    emailForm: { gap: theme.spacing.md },
    inputCard: { padding: 0 },
    whiteInputCard: { backgroundColor: colors.card },
    input: {
      padding: theme.spacing.lg,
      fontSize: theme.typography.fontSize.base,
      color: colors.text.primary,
      fontWeight: theme.typography.fontWeight.medium,
    },
    authButton: {
      backgroundColor: colors.accent,
      paddingVertical: 17,
      borderRadius: 14,
      alignItems: "center",
      justifyContent: "center",
      marginTop: theme.spacing.md,
      shadowColor: colors.accent,
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.45,
      shadowRadius: 12,
      elevation: 8,
    },
    authButtonText: {
      color: "#0D0D0D",
      fontSize: 16,
      fontWeight: "800",
      letterSpacing: 0.5,
    },
    toggleButton: {
      alignItems: "center",
      paddingVertical: theme.spacing.sm,
    },
    toggleText: {
      color: colors.accent,
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
      color: colors.text.secondary,
      fontSize: theme.typography.fontSize.sm,
      fontWeight: theme.typography.fontWeight.medium,
    },

    // Footer
    footer: {
      marginTop: 32,
      textAlign: "center",
      fontSize: 12,
      color: colors.text.tertiary,
      paddingHorizontal: theme.spacing.lg,
      lineHeight: 18,
    },
    linkText: {
      color: colors.accent,
      textDecorationLine: "underline",
    },

    // Error styles
    errorContainer: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: colors.errorBg,
      borderWidth: 1,
      borderColor: colors.error + "4D",
      borderRadius: 12,
      padding: 12,
      gap: 8,
      marginBottom: 16,
    },
    errorText: {
      flex: 1,
      color: colors.error,
      fontSize: 14,
      fontWeight: "500",
    },
    fieldError: {
      color: colors.error,
      fontSize: 12,
      marginTop: 6,
      marginLeft: 4,
    },
    inputCardError: {
      borderWidth: 1,
      borderColor: colors.error + "80",
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
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: "#FF5252",
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 16,
      marginTop: 8,
      alignSelf: "flex-start",
      gap: 6,
    },
    offlineBannerText: {
      color: "#FFFFFF",
      fontSize: 12,
      fontWeight: "600",
    },
    phoneErrorContainer: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginTop: 6,
    },
    retryButton: {
      marginTop: 8,
      paddingVertical: 8,
      paddingHorizontal: 16,
      backgroundColor: colors.accent,
      borderRadius: 8,
      alignSelf: "flex-start",
    },
    retryButtonText: {
      color: colors.text.inverse,
      fontSize: 14,
      fontWeight: "600",
    },
    retryButtonSmall: {
      paddingVertical: 4,
      paddingHorizontal: 12,
      backgroundColor: colors.accent,
      borderRadius: 6,
      marginLeft: 8,
    },
    retryButtonTextSmall: {
      color: colors.text.inverse,
      fontSize: 12,
      fontWeight: "600",
    },
    // Unused legacy
    phoneSection: { gap: theme.spacing.md, marginBottom: theme.spacing["3xl"] },
    phoneButton: { width: "100%" },
    phoneInputContainer: { flexDirection: "row", alignItems: "center" },
    phoneDivider: {
      width: 1,
      height: 24,
      backgroundColor: colors.border,
      marginHorizontal: 8,
    },
    phoneInput: {
      flex: 1,
      padding: theme.spacing.lg,
      fontSize: theme.typography.fontSize.base,
      color: colors.text.primary,
    },
    buttonContent: { flexDirection: "row", alignItems: "center", gap: 8 },
    emailButton: { marginTop: theme.spacing.md },
    appleButton: { borderRadius: 30, overflow: "hidden" },
    phoneSignupButton: {
      width: "100%",
      backgroundColor: colors.card,
      borderRadius: 16,
      paddingVertical: 16,
      borderWidth: 1,
      borderColor: colors.border,
    },
  });

export default LoginScreen;
