import React, { createContext, useState, useEffect, useContext } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getUserDocument } from '../services/api/user';

const AuthContext = createContext({});

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [onboardingComplete, setOnboardingComplete] = useState(false);

  const checkLoginStatus = async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      const storedUserData = await AsyncStorage.getItem('userData');

      if (token && storedUserData) {
        const parsedUser = JSON.parse(storedUserData);
        setUser(parsedUser); // Set basic user info from storage
        
        // Fetch latest profile data
        try {
          const profile = await getUserDocument(parsedUser._id);
          setUserData(profile);
          setOnboardingComplete(profile.onboardingCompleted);
        } catch (err) {
          console.error('Failed to fetch latest profile:', err);
          // Fallback to stored data if offline or error
          setUserData(parsedUser);
          setOnboardingComplete(parsedUser.onboardingCompleted);
        }
      } else {
        setUser(null);
        setUserData(null);
        setOnboardingComplete(false);
      }
    } catch (e) {
      console.error('Error checking login status:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkLoginStatus();
  }, []);

  const login = async (data) => {
    setUser(data);
    setUserData(data);
    setOnboardingComplete(data.onboardingCompleted);
  };

  const logout = async () => {
    try {
      await AsyncStorage.removeItem('userToken');
      await AsyncStorage.removeItem('userData');
      setUser(null);
      setUserData(null);
      setOnboardingComplete(false);
    } catch (e) {
      console.error('Error logging out:', e);
    }
  };

  const value = {
    user,
    userData,
    loading,
    onboardingComplete,
    setUserData,
    setOnboardingComplete,
    login, // Expose login function to update state after successful API login
    logout, // Expose logout function
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
