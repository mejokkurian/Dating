import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { getFocusedRouteNameFromRoute } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { View, StyleSheet, Platform, Text } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "../context/ThemeContext";
import { useBadge } from "../context/BadgeContext";
import { LiquidGlassTabBar } from "../components/LiquidGlassTabBar";
import { TabBarProvider } from "../context/TabBarContext";

// Screens
import MainScreen from "../screens/MainScreen";
import TopPicksStack from "./TopPicksStack";
import ConnectNowScreen from "../screens/ConnectNowScreen";
import MessagesScreen from "../screens/MessagesScreen";
import LikesYouScreen from "../screens/LikesYouScreen";

const Tab = createBottomTabNavigator();

const TabNavigator = () => {
  const { likesYouCount, unreadMessagesCount, updateBadgeCounts } = useBadge();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  // Update badge counts when navigator comes into focus
  React.useEffect(() => {
    updateBadgeCounts();
  }, []);

  return (
    <TabBarProvider>
      <Tab.Navigator
        tabBar={(props) => <LiquidGlassTabBar {...props} />}
        screenOptions={({ route }) => ({
          headerShown: false,
          tabBarShowLabel: false,
          sceneContainerStyle: { backgroundColor: colors.background },
          tabBarActiveTintColor: colors.tabIconActive,
          tabBarInactiveTintColor: colors.tabIconInactive,
          tabBarIcon: ({ focused, color, size }) => {
            let iconName;
            let badgeCount = null;
            const isLikesYou = route.name === "LikesYou";

            if (route.name === "Discover") {
              iconName = focused ? "albums" : "albums-outline";
            } else if (route.name === "TopPicks") {
              iconName = focused ? "flash" : "flash-outline";
            } else if (route.name === "ConnectNow") {
              iconName = focused ? "location" : "location-outline";
            } else if (route.name === "Messages") {
              iconName = focused ? "chatbubbles" : "chatbubbles-outline";
              badgeCount = unreadMessagesCount > 0 ? unreadMessagesCount : null;
            } else if (route.name === "LikesYou") {
              iconName = focused ? "heart" : "heart-outline";
              badgeCount = likesYouCount > 0 ? likesYouCount : null;
            }

            // Use solid black for active, gray for inactive
            const iconColor = focused
              ? colors.tabIconActive
              : colors.tabIconInactive;

            return (
              <View style={styles.iconWrapper}>
                <View
                  style={[
                    styles.iconContainer,
                    focused && styles.iconContainerActive,
                  ]}
                >
                  <Ionicons
                    name={iconName}
                    size={focused ? 30 : 28}
                    color={iconColor}
                  />
                  {/* Small dot indicator for LikesYou tab when active */}
                  {isLikesYou && focused && (
                    <View style={styles.likesYouIndicator} />
                  )}
                </View>
                {badgeCount !== null && badgeCount > 0 && (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>
                      {badgeCount > 99 ? "99+" : badgeCount}
                    </Text>
                  </View>
                )}
              </View>
            );
          },
        })}
      >
        <Tab.Screen name="Discover" component={MainScreen} />
        <Tab.Screen
          name="TopPicks"
          component={TopPicksStack}
          options={({ route }) => {
            const routeName = getFocusedRouteNameFromRoute(route);
            if (routeName === "TopPickProfile") {
              return { tabBarStyle: { display: "none" } };
            }
            return {};
          }}
        />
        <Tab.Screen name="ConnectNow" component={ConnectNowScreen} />

        <Tab.Screen name="LikesYou" component={LikesYouScreen} />
        <Tab.Screen name="Messages" component={MessagesScreen} />
      </Tab.Navigator>
    </TabBarProvider>
  );
};

const styles = StyleSheet.create({
  // Previous View based styles are largely irrelevant now as we use the custom component,
  // but we keep icon styles used by the renderItem
  iconWrapper: {
    position: "relative",
    alignItems: "center",
    justifyContent: "center",
  },
  iconContainer: {
    alignItems: "center",
    justifyContent: "center",
    width: 44,
    height: 44,
    borderRadius: 22,
    marginBottom: 2,
  },
  iconContainerActive: {
    backgroundColor: "transparent",
  },
  likesYouIndicator: {
    position: "absolute",
    top: 2,
    right: 2,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#000000",
    display: "none", // Hiding this for now as per design clean up
  },
  badge: {
    position: "absolute",
    top: -2,
    right: -2,
    backgroundColor: "#D4AF37",
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    paddingHorizontal: 4,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "transparent",
  },
  badgeText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "700",
    textAlign: "center",
  },
});

export default TabNavigator;
