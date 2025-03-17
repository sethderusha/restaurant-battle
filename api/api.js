// api/api.js
import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";

// Base URL configuration
const getBaseUrl = () => {
  if (__DEV__) {
    // Development - use local server
    // Note: Use your computer's IP address when testing on physical device
    return "http://localhost:5001";
  }
  // Production URL
  return "https://your-production-url.com"; // TODO: Change this to your production URL
};

const API_BASE_URL = getBaseUrl();

// Create axios instance
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    "Content-Type": "application/json",
  },
});

// Add a request interceptor to add the auth token to requests
apiClient.interceptors.request.use(
  async (config) => {
    try {
      const userData = await AsyncStorage.getItem('user');
      if (userData) {
        const { token } = JSON.parse(userData);
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
      }
    } catch (error) {
      console.error('Error adding auth token to request:', error);
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Authentication endpoints
export const login = async (username, password) => {
  try {
    const response = await apiClient.post("/api/auth/login", {
      username,
      password,
    });
    return response.data;
  } catch (error) {
    if (error.response?.data?.error) {
      throw new Error(error.response.data.error);
    }
    throw error;
  }
};

export const signup = async (username, password, displayName) => {
  try {
    const response = await apiClient.post("/api/auth/signup", {
      username,
      password,
      displayName,
    });
    return response.data;
  } catch (error) {
    if (error.response?.data?.error) {
      throw new Error(error.response.data.error);
    }
    throw error;
  }
};

// User settings endpoints
export const getUserSettings = async () => {
  try {
    const response = await apiClient.get("/api/user/settings");
    return response.data.settings;
  } catch (error) {
    console.error("Error fetching user settings:", error);
    throw error;
  }
};

export const updateUserSettings = async (settings) => {
  try {
    const response = await apiClient.put("/api/user/settings", settings);
    return response.data;
  } catch (error) {
    console.error("Error updating user settings:", error);
    throw error;
  }
};

// Favorites endpoints
export const getFavorites = async () => {
  try {
    const response = await apiClient.get("/api/favorites");
    return response.data.favorites;
  } catch (error) {
    console.error("Error fetching favorites:", error);
    throw error;
  }
};

export const addFavorite = async (restaurant) => {
  try {
    const response = await apiClient.post("/api/favorites", restaurant);
    return response.data;
  } catch (error) {
    console.error("Error adding favorite:", error);
    throw error;
  }
};

export const removeFavorite = async (placeId) => {
  try {
    const response = await apiClient.delete(`/api/favorites?place_id=${placeId}`);
    return response.data;
  } catch (error) {
    console.error("Error removing favorite:", error);
    throw error;
  }
};

// Restaurant endpoints
export const getNearbyRestaurants = async (
  sessionId,
  latitude,
  longitude,
  radius = 1000,
) => {
  try {
    const response = await apiClient.get("/api/nearby-restaurants", {
      params: {
        session_id: sessionId,
        latitude,
        longitude,
        radius,
      },
    });
    return response.data;
  } catch (error) {
    console.error("Error fetching nearby restaurants:", error);
    throw error;
  }
};

export const getNextRestaurant = async (sessionId) => {
  try {
    const response = await apiClient.post("/api/next-restaurant", {
      session_id: sessionId,
    });
    return response.data;
  } catch (error) {
    console.error("Error fetching next restaurant:", error);
    throw error;
  }
};

export const resetSession = async (sessionId) => {
  try {
    const response = await apiClient.post("/api/reset-session", {
      session_id: sessionId,
    });
    return response.data;
  } catch (error) {
    console.error("Error resetting session:", error);
    throw error;
  }
};

// Helper function to get photo URL
export const getPhotoUrl = (photoReference, maxWidth = 400) => {
  return `${API_BASE_URL}/api/photo?photo_reference=${photoReference}&max_width=${maxWidth}`;
};
