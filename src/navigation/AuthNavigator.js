import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { useAuth } from '../context/AuthContext';
import { ActivityIndicator, View, StyleSheet, Animated, Text } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

// Auth Screens
import LoginScreen from '../screens/auth/LoginScreen';
import SignUpScreen from '../screens/auth/SignUpScreen';
import PhoneOTPScreen from '../screens/auth/PhoneOTPScreen';
import AgeVerificationScreen from '../screens/auth/AgeVerificationScreen';

// Onboarding
import OnboardingWizard from '../screens/onboarding/OnboardingWizard';
import OnboardingIntroScreen from '../screens/onboarding/OnboardingIntroScreen';

// Verification
import KYCUploadScreen from '../screens/verification/KYCUploadScreen';
// ... existing imports ...

// ... inside Stack.Navigator ...


import VerifyAccountScreen from '../screens/verification/VerifyAccountScreen';
import PremiumScreen from '../screens/subscription/PremiumScreen';

// Main App (placeholder - to be implemented)
import TabNavigator from './TabNavigator';
import ChatScreen from '../screens/chat/ChatScreen';
import ViewUserProfileScreen from '../screens/profile/ViewUserProfileScreen';
import LikeProfileScreen from '../screens/LikeProfileScreen';

const Stack = createStackNavigator();

const AuthNavigator = ({ navigationRef }) => {
  const { user, loading, onboardingComplete } = useAuth();
  
  // Custom Transition: Slide from Left + Fade
  const authTransition = {
    animationEnabled: true,
    cardStyleInterpolator: ({ current, layouts }) => {
      return {
        cardStyle: {
          transform: [
            {
              translateX: current.progress.interpolate({
                inputRange: [0, 1],
                outputRange: [-layouts.screen.width, 0],
              }),
            },
          ],
          opacity: current.progress.interpolate({
            inputRange: [0, 0.5, 1],
            outputRange: [0, 0.5, 1],
          }),
        },
      };
    },
  };
  const pulseAnim = React.useRef(new Animated.Value(1)).current;
  const heartAnims = React.useRef(
    Array.from({ length: 5 }, () => ({
      translateY: new Animated.Value(0),
      opacity: new Animated.Value(0),
    }))
  ).current;

  React.useEffect(() => {
    if (loading) {
      // Pulse animation for logo
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.2,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
        ])
      ).start();

      // Animate hearts
      heartAnims.forEach((anim, index) => {
        Animated.loop(
          Animated.sequence([
            Animated.delay(index * 400),
            Animated.parallel([
              Animated.timing(anim.translateY, {
                toValue: -300,
                duration: 3000,
                useNativeDriver: true,
              }),
              Animated.sequence([
                Animated.timing(anim.opacity, {
                  toValue: 0.8,
                  duration: 500,
                  useNativeDriver: true,
                }),
                Animated.timing(anim.opacity, {
                  toValue: 0,
                  duration: 500,
                  delay: 2000,
                  useNativeDriver: true,
                }),
              ]),
            ]),
            Animated.timing(anim.translateY, {
              toValue: 0,
              duration: 0,
              useNativeDriver: true,
            }),
          ])
        ).start();
      });
    }
  }, [loading]);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <LinearGradient
          colors={['#1a1a1a', '#2d2d2d', '#1a1a1a']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        
        {/* Floating Hearts */}
        {heartAnims.map((anim, index) => (
          <Animated.View
            key={index}
            style={[
              styles.floatingHeart,
              {
                left: `${20 + index * 15}%`,
                transform: [{ translateY: anim.translateY }],
                opacity: anim.opacity,
              },
            ]}
          >
            <Ionicons name="heart" size={24} color="#D4AF37" />
          </Animated.View>
        ))}

        {/* Pulsing Logo/Icon */}
        <Animated.View style={[styles.logoContainer, { transform: [{ scale: pulseAnim }] }]}>
          <Ionicons name="heart-circle" size={80} color="#D4AF37" />
        </Animated.View>
        
        <Text style={styles.loadingText}>Finding your perfect match...</Text>
      </View>
    );
  }

  return (
    <NavigationContainer ref={navigationRef}>
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
        }}
      >
        {!user ? (
          // Auth Stack
          <>
            <Stack.Screen 
              name="Login" 
              component={LoginScreen}
              options={authTransition}
            />
            <Stack.Screen 
              name="SignUp" 
              component={SignUpScreen}
              options={authTransition}
            />
            <Stack.Screen 
              name="PhoneOTP" 
              component={PhoneOTPScreen}
              options={authTransition}
            />
          </>
        ) : !onboardingComplete ? (
          // Onboarding Stack
          <>
            <Stack.Screen name="AgeVerification" component={AgeVerificationScreen} />
            <Stack.Screen name="OnboardingIntro" component={OnboardingIntroScreen} options={{ headerShown: false }} />
            <Stack.Screen name="Onboarding" component={OnboardingWizard} />
            <Stack.Screen name="KYCUpload" component={KYCUploadScreen} />
            <Stack.Screen name="Premium" component={PremiumScreen} />
          </>
        ) : (
          // Main App Stack
          <>
            <Stack.Screen name="MainTab" component={TabNavigator} />
            <Stack.Screen name="Chat" component={ChatScreen} />
            <Stack.Screen 
              name="LikeProfile" 
              component={LikeProfileScreen}
              options={{
                headerShown: false,
              }}
            />
            <Stack.Screen 
              name="ViewUserProfile" 
              component={ViewUserProfileScreen}
              options={{
                headerShown: false,
              }}
            />
            <Stack.Screen 
              name="KYCUpload" 
              component={KYCUploadScreen}
              options={{
                headerShown: true,
                title: 'ID Verification',
              }}
            />
            <Stack.Screen 
              name="VerifyAccount" 
              component={VerifyAccountScreen}
              options={{
                headerShown: false,
              }}
            />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
  },
  floatingHeart: {
    position: 'absolute',
    bottom: 0,
  },
  logoContainer: {
    marginBottom: 30,
  },
  loadingText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
    marginTop: 20,
    opacity: 0.9,
  },
});

export default AuthNavigator;

