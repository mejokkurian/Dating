import React, { createContext, useContext } from 'react';
import { useSharedValue } from 'react-native-reanimated';

const TabBarContext = createContext(null);

export const TabBarProvider = ({ children }) => {
  const tabBarTranslateY = useSharedValue(0);
  return (
    <TabBarContext.Provider value={{ tabBarTranslateY }}>
      {children}
    </TabBarContext.Provider>
  );
};

export const useTabBar = () => useContext(TabBarContext);
