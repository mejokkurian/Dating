import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";

// Use your computer's IP address for Android emulator (e.g., 10.0.2.2) or localhost for iOS simulator
// Replace 'http://localhost:5000' with your actual backend URL
// Update this IP address to match your computer's current local IP (find it with: ifconfig | grep "inet " | grep -v 127.0.0.1)
// Make sure this matches the IP where your backend server is running
// const BASE_URL = "https://dating-5sfs.onrender.com/api";
// const BASE_URL = "https://dating-5sfs.onrender.com/api";
// Temporary use local backend with LAN IP for Real Device testing
const BASE_URL = "http://192.168.1.7:5001/api";

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 30000, // 30 seconds timeout
  headers: {
    "Content-Type": "application/json",
  },
});

// Add a request interceptor to add the auth token to every request
api.interceptors.request.use(
  async (config) => {
    const token = await AsyncStorage.getItem("userToken");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export default api;
