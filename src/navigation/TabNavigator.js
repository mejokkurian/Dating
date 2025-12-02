import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { View, StyleSheet, Platform, Text } from 'react-native';
import theme from '../theme/theme';

// Screens
import MainScreen from '../screens/MainScreen';
import TopPicksScreen from '../screens/TopPicksScreen';
import ConnectNowScreen from '../screens/ConnectNowScreen';
import MessagesScreen from '../screens/MessagesScreen';
import PremiumScreen from '../screens/subscription/PremiumScreen';
import UserProfileScreen from '../screens/profile/UserProfileScreen';
import EditProfileScreen from '../screens/profile/EditProfileScreen';
import ProfilePreviewScreen from '../screens/profile/ProfilePreviewScreen';

const Tab = createBottomTabNavigator();

const TabNavigator = () => {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarShowLabel: false,
        tabBarStyle: styles.tabBar,
        tabBarActiveTintColor: theme.colors.primary || '#000000',
        tabBarInactiveTintColor: '#999999',
        tabBarLabelStyle: styles.tabBarLabel,
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;

          if (route.name === 'Discover') {
            iconName = focused ? 'heart' : 'heart-outline';
          } else if (route.name === 'TopPicks') {
            iconName = focused ? 'flash' : 'flash-outline';
          } else if (route.name === 'ConnectNow') {
            iconName = focused ? 'location' : 'location-outline';
          } else if (route.name === 'Messages') {
            iconName = focused ? 'chatbubbles' : 'chatbubbles-outline';
          } else if (route.name === 'Premium') {
            iconName = focused ? 'diamond' : 'diamond-outline';
          } else if (route.name === 'Profile') {
            iconName = focused ? 'person' : 'person-outline';
          }

          return (
            <View style={[styles.iconContainer, focused && styles.iconContainerActive]}>
              <Ionicons 
                name={iconName} 
                size={focused ? 26 : 24} 
                color={color}
                style={focused && styles.iconActive}
              />
            </View>
          );
        },
      })}
    >
      <Tab.Screen name="Discover" component={MainScreen} />
      <Tab.Screen name="TopPicks" component={TopPicksScreen} />
      <Tab.Screen name="ConnectNow" component={ConnectNowScreen} />
      <Tab.Screen name="Messages" component={MessagesScreen} />
      {/* <Tab.Screen name="Premium" component={PremiumScreen} initialParams={{ isTab: true }} /> */}
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
    bottom: Platform.OS === 'ios' ? 20 : 10,
    left: 16,
    right: 16,
    elevation: 0,
    backgroundColor: '#FFFFFF',
    borderRadius: 25,
    height: 70,
    borderTopWidth: 0,
    paddingBottom: Platform.OS === 'ios' ? 10 : 8,
    paddingTop: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 12,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.05)',
  },
  tabBarLabel: {
    fontSize: 11,
    fontWeight: '700',
    marginTop: 4,
    letterSpacing: 0.3,
  },
  iconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 44,
    height: 44,
    borderRadius: 22,
    marginBottom: 2,
  },
  iconContainerActive: {
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
  },
  iconActive: {
    transform: [{ scale: 1.1 }],
  },
});

export default TabNavigator;

