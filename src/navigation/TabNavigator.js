import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { View, StyleSheet, Platform, Animated } from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import theme from '../theme/theme';

// Screens
import MainScreen from '../screens/MainScreen';
import TopPicksScreen from '../screens/TopPicksScreen';
import MessagesScreen from '../screens/MessagesScreen';
import PremiumScreen from '../screens/subscription/PremiumScreen';
import UserProfileScreen from '../screens/profile/UserProfileScreen';
import EditProfileScreen from '../screens/profile/EditProfileScreen';
import ProfilePreviewScreen from '../screens/profile/ProfilePreviewScreen';

const Tab = createBottomTabNavigator();

const CustomTabBarIcon = ({ focused, iconName, color, isPremium }) => {
  const scaleValue = React.useRef(new Animated.Value(focused ? 1 : 0.9)).current;
  const pulseAnim = React.useRef(new Animated.Value(1)).current;

  React.useEffect(() => {
    Animated.spring(scaleValue, {
      toValue: focused ? 1.1 : 1,
      friction: 3,
      tension: 40,
      useNativeDriver: true,
    }).start();
  }, [focused]);

  // Pulsing animation for Premium tab
  React.useEffect(() => {
    if (isPremium) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.15,
            duration: 1500,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1500,
            useNativeDriver: true,
          }),
        ])
      ).start();
    }
  }, [isPremium]);

  return (
    <Animated.View style={[
      styles.iconContainer,
      focused && styles.activeIconContainer,
      { transform: [{ scale: scaleValue }] }
    ]}>
      {/* Premium Aura Effect */}
      {isPremium && (
        <>
          <Animated.View 
            style={[
              styles.premiumAura,
              { transform: [{ scale: pulseAnim }] }
            ]} 
          />
          <View style={styles.premiumGlow} />
        </>
      )}
      
      {focused && !isPremium && (
        <LinearGradient
          colors={[theme.colors.primary + '20', theme.colors.primary + '10']}
          style={styles.activeIconBackground}
        />
      )}
      <Ionicons name={iconName} size={focused ? 26 : 24} color={color} />
      {focused && <View style={styles.activeDot} />}
    </Animated.View>
  );
};

const TabNavigator = () => {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarShowLabel: false,
        tabBarStyle: styles.tabBar,
        tabBarActiveTintColor: '#D4AF37', // Elegant gold for active icons
        tabBarInactiveTintColor: '#888888', // Gray inactive icons
        tabBarBackground: () => null, // Remove background component
        tabBarIcon: ({ focused, color }) => {
          let iconName;

          if (route.name === 'Discover') {
            iconName = focused ? 'heart' : 'heart-outline';
          } else if (route.name === 'TopPicks') {
            iconName = focused ? 'flash' : 'flash-outline';
          } else if (route.name === 'Messages') {
            iconName = focused ? 'chatbubbles' : 'chatbubbles-outline';
          } else if (route.name === 'Premium') {
            iconName = focused ? 'diamond' : 'diamond-outline';
          } else if (route.name === 'Profile') {
            iconName = focused ? 'person' : 'person-outline';
          }

          return <CustomTabBarIcon 
            focused={focused} 
            iconName={iconName} 
            color={color} 
            isPremium={route.name === 'Premium'}
          />;
        },
      })}
    >
      <Tab.Screen name="Discover" component={MainScreen} />
      <Tab.Screen name="TopPicks" component={TopPicksScreen} />
      <Tab.Screen name="Messages" component={MessagesScreen} />
      <Tab.Screen name="Premium" component={PremiumScreen} initialParams={{ isTab: true }} />
      <Tab.Screen name="Profile" component={UserProfileScreen} />
      {/* Hidden screens for navigation (no tab bar button) */}
      <Tab.Screen
        name="EditProfile"
        component={EditProfileScreen}
        options={{ tabBarButton: () => null, headerShown: false }}
      />
      <Tab.Screen
        name="ProfilePreview"
        component={ProfilePreviewScreen}
        options={{ tabBarButton: () => null, headerShown: false }}
      />
    </Tab.Navigator>
  );
};

const styles = StyleSheet.create({
  tabBar: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 30 : 20,
    left: 20,
    right: 20,
    elevation: 0,
    backgroundColor: '#1A1A1A', // Almost black, softer than pure black
    borderRadius: 35,
    height: 70,
    borderTopWidth: 0,
    paddingBottom: 0,
    paddingTop: 0,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 10,
    borderWidth: 1,
    borderColor: '#333333',
  },
  tabBarBackground: {
    display: 'none',
  },
  tabBarOverlay: {
    display: 'none',
  },
  iconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  activeIconContainer: {
    backgroundColor: 'rgba(212, 175, 55, 0.15)', // Subtle gold tint for active state
  },
  activeIconBackground: {
    display: 'none',
  },
  activeDot: {
    display: 'none',
  },
  premiumAura: {
    position: 'absolute',
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: 'rgba(212, 175, 55, 0.12)',
    shadowColor: '#D4AF37',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 4,
  },
  premiumGlow: {
    position: 'absolute',
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: 'rgba(212, 175, 55, 0.08)',
    shadowColor: '#D4AF37',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 3,
  },
});

export default TabNavigator;
