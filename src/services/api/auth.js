import api from "./config";
import AsyncStorage from "@react-native-async-storage/async-storage";

export const signInWithEmail = async (email, password) => {
  try {
    console.log('🔍 Email login to:', api.defaults.baseURL);
    const response = await api.post("/auth/login", { email, password });
    if (response.data.token) {
      await AsyncStorage.setItem("userToken", response.data.token);
      await AsyncStorage.setItem("userData", JSON.stringify(response.data));
    }
    console.log('✅ Email login successful');
    return response.data;
  } catch (error) {
    console.error('❌ Email login error details:');
    console.error('  Code:', error.code);
    console.error('  Message:', error.message);
    console.error('  Base URL:', api.defaults.baseURL);
    
    // Handle timeout and network errors
    if (error.code === "ECONNABORTED" || error.message?.includes("timeout")) {
      throw {
        message:
          "Request timed out. Please check your connection and ensure the backend server is running.",
        code: "TIMEOUT",
      };
    }
    if (
      error.code === "ECONNREFUSED" ||
      error.message?.includes("Network Error")
    ) {
      throw {
        message:
          "Cannot connect to server. Please check that the backend is running and the IP address is correct.",
        code: "CONNECTION_ERROR",
      };
    }
    throw error.response ? error.response.data : error;
  }
};

export const createAccountWithEmail = async (email, password, displayName) => {
  try {
    console.log('🔍 Account creation to:', api.defaults.baseURL);
    const response = await api.post("/auth/register", {
      email,
      password,
      displayName,
    });
    if (response.data.token) {
      await AsyncStorage.setItem("userToken", response.data.token);
      await AsyncStorage.setItem("userData", JSON.stringify(response.data));
    }
    console.log('✅ Account created successfully');
    return response.data;
  } catch (error) {
    console.error('❌ Account creation error details:');
    console.error('  Code:', error.code);
    console.error('  Message:', error.message);
    console.error('  Base URL:', api.defaults.baseURL);
    
    // Handle timeout and network errors
    if (error.code === "ECONNABORTED" || error.message?.includes("timeout")) {
      throw {
        message:
          "Request timed out. Please check your connection and ensure the backend server is running.",
        code: "TIMEOUT",
      };
    }
    if (
      error.code === "ECONNREFUSED" ||
      error.message?.includes("Network Error")
    ) {
      throw {
        message:
          "Cannot connect to server. Please check that the backend is running and the IP address is correct.",
        code: "CONNECTION_ERROR",
      };
    }
    throw error.response ? error.response.data : error;
  }
};

export const signOut = async () => {
  try {
    await AsyncStorage.removeItem("userToken");
    await AsyncStorage.removeItem("userData");
  } catch (error) {
    console.error("Error signing out:", error);
  }
};

// Mocking other auth methods for now or implementing if backend supports them
export const signInWithGoogle = async (googleData) => {
  try {
    // Map 'token' to 'idToken' if needed
    const payload = {
      ...googleData,
      idToken: googleData.token || googleData.idToken,
    };

    const response = await api.post("/auth/google", payload);
    if (response.data.token) {
      await AsyncStorage.setItem("userToken", response.data.token);
      await AsyncStorage.setItem("userData", JSON.stringify(response.data));
    }
    return response.data;
  } catch (error) {
    throw error.response ? error.response.data : error;
  }
};

export const signInWithApple = async (appleData) => {
  try {
    // Map 'token' to 'identityToken' if needed, or ensure caller passes 'identityToken'
    const payload = {
      ...appleData,
      identityToken: appleData.token || appleData.identityToken,
    };
    
    const response = await api.post("/auth/apple", payload);
    if (response.data.token) {
      await AsyncStorage.setItem("userToken", response.data.token);
      await AsyncStorage.setItem("userData", JSON.stringify(response.data));
    }
    return response.data;
  } catch (error) {
    throw error.response ? error.response.data : error;
  }
};

export const signInWithPhoneNumber = async (phoneNumber) => {
  try {
    console.log('🔍 Attempting phone auth to:', api.defaults.baseURL);
    console.log('🔍 Full endpoint:', `${api.defaults.baseURL}/auth/phone/send`);
    console.log('🔍 Phone number:', phoneNumber);
    
    const response = await api.post("/auth/phone/send", { phoneNumber });
    console.log('✅ Phone auth response:', response.data);
    return response.data;
  } catch (error) {
    console.error('❌ Phone auth error - Full details:');
    console.error('  Code:', error.code);
    console.error('  Message:', error.message);
    console.error('  Response:', error.response?.data);
    console.error('  Status:', error.response?.status);
    console.error('  Config URL:', error.config?.url);
    console.error('  Base URL:', error.config?.baseURL);
    throw error.response ? error.response.data : error;
  }
};

export const verifyPhoneOTP = async (phoneNumber, code) => {
  try {
    const response = await api.post("/auth/phone/verify", {
      phoneNumber,
      code,
    });
    if (response.data.token) {
      await AsyncStorage.setItem("userToken", response.data.token);
      await AsyncStorage.setItem("userData", JSON.stringify(response.data));
    }
    return response.data;
  } catch (error) {
    throw error.response ? error.response.data : error;
  }
};

export const requestPasswordReset = async (email) => {
  try {
    const response = await api.post("/auth/reset-password", { email });
    return response.data;
  } catch (error) {
    throw error.response ? error.response.data : error;
  }
};

export const confirmPasswordReset = async (resetToken, newPassword) => {
  try {
    const response = await api.post("/auth/reset-password/confirm", {
      resetToken,
      newPassword,
    });
    return response.data;
  } catch (error) {
    throw error.response ? error.response.data : error;
  }
};
