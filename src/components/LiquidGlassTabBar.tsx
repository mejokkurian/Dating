import React from "react";
import { View, StyleSheet, TouchableOpacity } from "react-native";
import {
  Canvas,
  RoundedRect,
  BackdropBlur,
  Fill,
  rrect,
  rect,
  Shadow,
} from "@shopify/react-native-skia";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import Animated, {
  useSharedValue,
  withSpring,
  withTiming,
  useDerivedValue,
  useAnimatedStyle,
} from "react-native-reanimated";
import { useTheme } from "../context/ThemeContext";
import { useTabBar } from "../context/TabBarContext";

const TAB_WIDTH = 338;
const TAB_HEIGHT = 66;
const BORDER_RADIUS = 33;

export const LiquidGlassTabBar: React.FC<BottomTabBarProps> = ({
  state,
  descriptors,
  navigation,
}) => {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const tabBarCtx = useTabBar();
  const tabBarTranslateY = tabBarCtx?.tabBarTranslateY;

  const animatedContainerStyle = useAnimatedStyle(() => ({
    transform: [
      {
        translateY: tabBarTranslateY
          ? withTiming(tabBarTranslateY.value, { duration: 250 })
          : 0,
      },
    ],
  }));

  const visibleRoutes = state.routes.filter((route) => {
    const { options } = descriptors[route.key];
    if (options.tabBarButton) return false;
    const itemStyle = StyleSheet.flatten(options.tabBarItemStyle);
    if (itemStyle?.display === "none") return false;
    return true;
  });

  const activeRoute = state.routes[state.index];
  const activeIndexInVisible = visibleRoutes.findIndex(
    (r) => r.key === activeRoute.key,
  );

  const focusedOptions = descriptors[state.routes[state.index].key].options;
  const tabBarStyle = StyleSheet.flatten(focusedOptions.tabBarStyle) as any;
  const isHidden = tabBarStyle?.display === "none";

  const activeTab = useSharedValue(
    activeIndexInVisible >= 0 ? activeIndexInVisible : 0,
  );

  React.useEffect(() => {
    if (activeIndexInVisible >= 0) {
      activeTab.value = withSpring(activeIndexInVisible, {
        mass: 0.8,
        damping: 15,
        stiffness: 150,
      });
    }
  }, [activeIndexInVisible]);

  const tabWidth = TAB_WIDTH / (visibleRoutes.length || 1);

  const indicatorX = useDerivedValue(() => activeTab.value * tabWidth);
  const indicatorOpacity = useDerivedValue(() =>
    withSpring(activeIndexInVisible >= 0 ? 1 : 0),
  );
  const indicatorXOffset = useDerivedValue(() => indicatorX.value + 4);

  if (isHidden) return null;

  const roundedRect = rrect(
    rect(0, 0, TAB_WIDTH, TAB_HEIGHT),
    BORDER_RADIUS,
    BORDER_RADIUS,
  );

  return (
    <Animated.View
      style={[styles.container, { bottom: 30 }, animatedContainerStyle]}
    >
      {/* Glass background — all color values driven by theme */}
      <Canvas style={styles.canvas}>
        {/* Outer gold glow shadow */}
        <RoundedRect rect={roundedRect} color="transparent">
          <Shadow dx={0} dy={6} blur={20} color="rgba(212,175,55,0.18)" />
          <Shadow dx={0} dy={2} blur={8} color="rgba(0,0,0,0.28)" />
        </RoundedRect>

        {/* Frosted glass fill */}
        <BackdropBlur blur={30} clip={roundedRect}>
          <Fill color={colors.tabBarFill} />
        </BackdropBlur>

        {/* Gold hairline border */}
        <RoundedRect
          rect={roundedRect}
          style="stroke"
          strokeWidth={1}
          color={colors.tabBarBorder}
        />

        {/* Liquid active indicator */}
        <RoundedRect
          x={indicatorXOffset}
          y={13}
          width={tabWidth - 10}
          height={TAB_HEIGHT - 26}
          r={(TAB_HEIGHT - 26) / 2}
          color={colors.tabBarIndicator}
          opacity={indicatorOpacity}
        />
      </Canvas>

      {/* Icons */}
      <View style={styles.iconContainer}>
        {visibleRoutes.map((route, index) => {
          const { options } = descriptors[route.key];
          const isFocused = activeIndexInVisible === index;

          const onPress = () => {
            const event = navigation.emit({
              type: "tabPress",
              target: route.key,
              canPreventDefault: true,
            });
            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name);
            }
          };

          return (
            <TouchableOpacity
              key={route.key}
              onPress={onPress}
              style={styles.tabButton}
              activeOpacity={0.7}
            >
              {options.tabBarIcon
                ? options.tabBarIcon({
                    focused: isFocused,
                    color: isFocused
                      ? colors.tabIconActive
                      : colors.tabIconInactive,
                    size: 28,
                  })
                : null}
            </TouchableOpacity>
          );
        })}
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    alignSelf: "center",
    width: TAB_WIDTH,
    height: TAB_HEIGHT,
    elevation: 10,
    shadowColor: "#D4AF37",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
  },
  canvas: {
    flex: 1,
    width: "100%",
    height: "100%",
  },
  iconContainer: {
    ...StyleSheet.absoluteFillObject,
    flexDirection: "row",
    justifyContent: "space-evenly",
    alignItems: "center",
  },
  tabButton: {
    width: 60,
    height: 60,
    justifyContent: "center",
    alignItems: "center",
  },
});
