import api from './config';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const signInWithEmail = async (email, password) => {
  try {
    const response = await api.post('/auth/login', { email, password });
    if (response.data.token) {
      await AsyncStorage.setItem('userToken', response.data.token);
      await AsyncStorage.setItem('userData', JSON.stringify(response.data));
    }
    return response.data;
  } catch (error) {
    throw error.response ? error.response.data : error;
  }
};

export const createAccountWithEmail = async (email, password, displayName) => {
  try {
    const response = await api.post('/auth/register', { email, password, displayName });
    if (response.data.token) {
      await AsyncStorage.setItem('userToken', response.data.token);
      await AsyncStorage.setItem('userData', JSON.stringify(response.data));
    }
    return response.data;
  } catch (error) {
    throw error.response ? error.response.data : error;
  }
};

export const signOut = async () => {
  try {
    await AsyncStorage.removeItem('userToken');
    await AsyncStorage.removeItem('userData');
  } catch (error) {
    console.error('Error signing out:', error);
  }
};

// Mocking other auth methods for now or implementing if backend supports them
export const signInWithGoogle = async () => {
  // Implement social login logic here calling /auth/social
  console.warn('Google Sign In not fully implemented in frontend yet');
};

export const signInWithApple = async () => {
  // Implement social login logic here calling /auth/social
  console.warn('Apple Sign In not fully implemented in frontend yet');
};

export const signInWithPhoneNumber = async (phoneNumber) => {
  try {
    const response = await api.post('/auth/phone/send', { phoneNumber });
    return response.data;
  } catch (error) {
    throw error.response ? error.response.data : error;
  }
};

export const verifyPhoneOTP = async (phoneNumber, code) => {
  try {
    const response = await api.post('/auth/phone/verify', { phoneNumber, code });
    if (response.data.token) {
      await AsyncStorage.setItem('userToken', response.data.token);
      await AsyncStorage.setItem('userData', JSON.stringify(response.data));
    }
    return response.data;
  } catch (error) {
    throw error.response ? error.response.data : error;
  }
};
