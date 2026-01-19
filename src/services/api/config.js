import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";

// Backend URL Configuration
// Toggle between local development and production domain
const USE_EC2 = true; // Set to true to use production server, false for local development

const LOCAL_URL = "http://192.168.1.8:5001/api";  // Your local development server
const EC2_URL = "https://api.emper.fun/api";       // Your production server (HTTPS - secure!)

const BASE_URL = USE_EC2 ? EC2_URL : LOCAL_URL;

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 60000, // 60 seconds timeout (increased for EC2)
  headers: {
    "Content-Type": "application/json",
  },
});

// Debug: Log the actual URL being used
console.log('🔧 API Config:', { BASE_URL, USE_EC2 });

// Add a request interceptor to add the auth token to every request
api.interceptors.request.use(
  async (config) => {
    const token = await AsyncStorage.getItem("userToken");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    console.log(`📤 API Request: ${config.method?.toUpperCase()} ${config.baseURL}${config.url}`);
    return config;
  },
  (error) => {
    console.error('📤 Request interceptor error:', error);
    return Promise.reject(error);
  }
);

// Add a response interceptor to log all responses
api.interceptors.response.use(
  (response) => {
    console.log(`📥 API Response: ${response.status} ${response.config.url}`);
    return response;
  },
  (error) => {
    if (error.response) {
      // Server responded with error status
      console.error(`📥 API Error Response: ${error.response.status} ${error.config?.url}`);
    } else if (error.request) {
      // Request made but no response received
      console.error('📥 API No Response:', error.message);
      console.error('   Request URL:', error.config?.baseURL + error.config?.url);
    } else {
      // Error in request setup
      console.error('📥 API Request Setup Error:', error.message);
    }
    return Promise.reject(error);
  }
);

// Test connection function
export const testConnection = async () => {
  try {
    console.log('🧪 Testing connection to:', BASE_URL);
    const response = await api.get('/auth/health').catch(() => {
      // If health endpoint doesn't exist, try a simple GET that might return 404
      return api.get('/').catch(err => {
        // Even a 404 means we can connect
        if (err.response?.status === 404) {
          return { data: { status: 'connected' }, status: 404 };
        }
        throw err;
      });
    });
    console.log('✅ Connection test successful:', response.status);
    return true;
  } catch (error) {
    console.error('❌ Connection test failed:', error.message);
    return false;
  }
};

export default api;
export { BASE_URL, USE_EC2, LOCAL_URL, EC2_URL };
