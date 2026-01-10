import api from './config';

export const getUserDocument = async (userId) => {
  try {
    const response = await api.get('/users/profile');
    return response.data;
  } catch (error) {
    console.error('Error fetching user profile:', error);
    throw error;
  }
};

export const createUserDocument = async (userId, userData) => {
  try {
    // In the new backend, we might use updateProfile for this or a specific endpoint
    // Since register already creates the user, this might be an update
    const response = await api.put('/users/profile', userData);
    return response.data;
  } catch (error) {
    throw error;
  }
};

export const updateUserDocument = async (userId, updates) => {
  try {
    const response = await api.put('/users/profile', updates);
    return response.data;
  } catch (error) {
    throw error;
  }
};

export const saveOnboardingProgress = async (userId, progress) => {
  try {
    const response = await api.post('/users/onboarding', progress);
    return response.data;
  } catch (error) {
    throw error;
  }
};

export const isOnboardingComplete = async (userId) => {
  try {
    const response = await api.get('/users/profile');
    return response.data.onboardingCompleted;
  } catch (error) {
    return false;
  }
};

export const getPotentialMatches = async () => {
  try {
    const response = await api.get('/users/matches');
    return response.data;
  } catch (error) {
    console.error('Error fetching matches:', error);
    return [];
  }
};

export const getUserById = async (userId) => {
  try {
    const response = await api.get(`/users/profile/${userId}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching user by ID:', error);
    throw error;
  }
};

/**
 * Register push notification token with backend
 * @param {string} token - Expo push token
 * @param {string} deviceId - Optional device ID
 * @returns {Promise<Object>}
 */
export const registerPushToken = async (token, deviceId = null) => {
  try {
    console.log('📤 Registering push token with backend:', { 
      token: token ? token.substring(0, 30) + '...' : 'null',
      deviceId 
    });
    const response = await api.post('/users/push-token', { token, deviceId });
    console.log('✅ Push token registration successful:', response.data);
    return response.data;
  } catch (error) {
    console.error('❌ Error registering push token:', error.response?.data || error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
    throw error;
  }
};
export const deleteUserAccount = async (userId) => {
  try {
    const response = await api.delete('/users/profile');
    return response.data;
  } catch (error) {
    throw error;
  }
};
