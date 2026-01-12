import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import { Canvas, Rect, RoundedRect, BackdropBlur, Fill, rrect, rect, Shadow, Group } from '@shopify/react-native-skia';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import Animated, { 
  useSharedValue, 
  withSpring, 
  useDerivedValue,
} from 'react-native-reanimated';

const TAB_WIDTH = 350;
const TAB_HEIGHT = 65;
const BORDER_RADIUS = 32.5;

export const LiquidGlassTabBar: React.FC<BottomTabBarProps> = ({ state, descriptors, navigation }) => {
  const insets = useSafeAreaInsets();
  
  // Apply visual filter for hidden tabs same as before to ensure alignment
  const visibleRoutes = state.routes.filter((route) => {
    const { options } = descriptors[route.key];
    if (options.tabBarButton) return false;
    const itemStyle = StyleSheet.flatten(options.tabBarItemStyle);
    if (itemStyle?.display === 'none') return false;
    return true;
  });

  const activeRoute = state.routes[state.index];
  const activeIndexInVisible = visibleRoutes.findIndex(r => r.key === activeRoute.key);

  const focusedOptions = descriptors[state.routes[state.index].key].options;
  const tabBarStyle = StyleSheet.flatten(focusedOptions.tabBarStyle) as any;
  if (tabBarStyle?.display === 'none') {
    return null;
  }
  
  // Re-add Animated Logic for Liquid Indicator
  const activeTab = useSharedValue(activeIndexInVisible >= 0 ? activeIndexInVisible : 0);

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

  // Derived value for the indicator alignment
  const indicatorX = useDerivedValue(() => {
    return activeTab.value * tabWidth;
  });
  
  // Derived value for opacity of indicator
  const indicatorOpacity = useDerivedValue(() => {
     return withSpring(activeIndexInVisible >= 0 ? 1 : 0);
  });
  
  // The Glass Pill Shape
  // We center it horizontally
  const roundedRect = rrect(rect(0, 0, TAB_WIDTH, TAB_HEIGHT), BORDER_RADIUS, BORDER_RADIUS);

  // Bottom positioning: Apple standard usually floats, we use 30 offset
  const bottomOffset = 30; 

  return (
    <View style={[styles.container, { bottom: bottomOffset }]}>
      {/* 1. THE GLASS BACKGROUND (Clean, no inner boxes) */}
      <Canvas style={styles.canvas}>
        <RoundedRect rect={roundedRect} color="transparent">
           <Shadow dx={0} dy={4} blur={12} color="rgba(0,0,0,0.1)" />
        </RoundedRect>

        {/* Blur & Fill */}
        <BackdropBlur blur={30} clip={roundedRect}>
           <Fill color="rgba(255, 255, 255, 0.80)" />
        </BackdropBlur>

        {/* The Hairline Border (The "Apple" stroke) */}
        <RoundedRect
          rect={roundedRect}
          style="stroke"
          strokeWidth={1}
          color="rgba(0, 0, 0, 0.1)" 
        />
        
        {/* Active Indicator (Liquid Effect) - Restored */}
        <RoundedRect 
            x={useDerivedValue(() => indicatorX.value + 4)} 
            y={12} 
            width={tabWidth - 8} 
            height={TAB_HEIGHT - 24} 
            r={(TAB_HEIGHT - 24) / 2} 
            color="rgba(0, 0, 0, 0.05)" 
            opacity={indicatorOpacity}
        />
      </Canvas>

      {/* 2. THE ICONS (Standard Apple Layout) */}
      <View style={styles.iconContainer}>
        {visibleRoutes.map((route, index) => {
          const { options } = descriptors[route.key];
          const isFocused = activeIndexInVisible === index;

          const onPress = () => {
            const event = navigation.emit({
              type: 'tabPress',
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
              {options.tabBarIcon ? options.tabBarIcon({ 
                 focused: isFocused, 
                 color: isFocused ? '#000000' : '#A0A0A0', 
                 size: 28 
              }) : null}
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    alignSelf: 'center',
    width: TAB_WIDTH,
    height: TAB_HEIGHT,
  },
  canvas: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  iconContainer: {
    ...StyleSheet.absoluteFillObject,
    flexDirection: 'row',
    justifyContent: 'space-evenly',
    alignItems: 'center',
  },
  tabButton: {
    width: 60,
    height: 60,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
