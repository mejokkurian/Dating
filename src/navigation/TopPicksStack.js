import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import TopPicksScreen from '../screens/TopPicksScreen';
import TopPickProfileScreen from '../screens/TopPickProfileScreen';

const Stack = createStackNavigator();

const TopPicksStack = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
      }}
      initialRouteName="TopPicksList"
    >
      <Stack.Screen name="TopPicksList" component={TopPicksScreen} />
      <Stack.Screen name="TopPickProfile" component={TopPickProfileScreen} />
    </Stack.Navigator>
  );
};

export default TopPicksStack;
