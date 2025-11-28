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
export const signInWithGoogle = async (googleData) => {
  try {
    const response = await api.post('/auth/google', googleData);
    if (response.data.token) {
      await AsyncStorage.setItem('userToken', response.data.token);
      await AsyncStorage.setItem('userData', JSON.stringify(response.data));
    }
    return response.data;
  } catch (error) {
    throw error.response ? error.response.data : error;
  }
};

export const signInWithApple = async (appleData) => {
  try {
    const response = await api.post('/auth/apple', appleData);
    if (response.data.token) {
      await AsyncStorage.setItem('userToken', response.data.token);
      await AsyncStorage.setItem('userData', JSON.stringify(response.data));
    }
    return response.data;
  } catch (error) {
    throw error.response ? error.response.data : error;
  }
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

export const requestPasswordReset = async (email) => {
  try {
    const response = await api.post('/auth/reset-password', { email });
    return response.data;
  } catch (error) {
    throw error.response ? error.response.data : error;
  }
};

export const confirmPasswordReset = async (resetToken, newPassword) => {
  try {
    const response = await api.post('/auth/reset-password/confirm', {
      resetToken,
      newPassword,
    });
    return response.data;
  } catch (error) {
    throw error.response ? error.response.data : error;
  }
};
