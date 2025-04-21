// api/api.js
const axios = require("axios").default;
const AsyncStorage = require("@react-native-async-storage/async-storage");
const Constants = require('expo-constants');
const { Platform } = require('react-native');
const { API_URL } = require('../config');

let restaurantData = [];
let currentIndex = 0;
// Default to false, will be updated when checked
let isTestMode = false;

// Base URL configuration
const getBaseUrl = () => {
  // Use the API_URL from config
  return API_URL.replace('/api', '');
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

// Storage helper functions
const getStorage = () => {
  if (Platform.OS === 'web') {
    return {
      getItem: (key) => localStorage.getItem(key),
      setItem: (key, value) => localStorage.setItem(key, value),
      removeItem: (key) => localStorage.removeItem(key)
    };
  }
  return AsyncStorage;
};

// Check if test mode is enabled
const checkTestMode = async () => {
  try {
    const storage = getStorage();
    const testMode = await storage.getItem('test_mode');
    isTestMode = testMode === 'true';
    return isTestMode;
  } catch (error) {
    console.error('Error checking test mode:', error);
    return false;
  }
};

// Add a request interceptor to add the auth token to requests
apiClient.interceptors.request.use(
  async (config) => {
    try {
      // Check test mode status
      await checkTestMode();
      
      const storage = getStorage();
      const userData = await storage.getItem('user');
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

// Test mode functions
const loadTestData = async () => {
  try {
    console.log('Loading test data...');
    // Directly require the test.json file
    restaurantData = require('../../test.json');
    currentIndex = 0;
    console.log(`Loaded ${restaurantData.length} test restaurants`);
  } catch (error) {
    console.error('Error loading test data:', error);
    restaurantData = [];
  }
};

const getNextTestRestaurant = () => {
  if (restaurantData.length === 0) {
    console.log('No test restaurants available');
    return null;
  }
  const restaurant = restaurantData[currentIndex];
  currentIndex = (currentIndex + 1) % restaurantData.length;
  console.log(`Returning test restaurant ${currentIndex}/${restaurantData.length}: ${restaurant.name}`);
  return restaurant;
};

// Export function to set test mode
const setTestMode = async (enabled) => {
  try {
    const storage = getStorage();
    await storage.setItem('test_mode', enabled.toString());
    isTestMode = enabled;
    console.log('Test mode set to:', enabled);
  } catch (error) {
    console.error('Error setting test mode:', error);
  }
};

// Authentication endpoints
const login = async (username, password) => {
  if (isTestMode) {
    console.log('Test mode: Simulating login');
    return { token: 'test-token', user: { username, displayName: username } };
  }
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

const signup = async (username, password, displayName) => {
  if (isTestMode) {
    console.log('Test mode: Simulating signup');
    return { token: 'test-token', user: { username, displayName } };
  }
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
const getUserSettings = async () => {
  if (isTestMode) {
    console.log('Test mode: Returning test settings');
    return { preferences: { radius: 1000, priceLevel: 2 } };
  }
  try {
    const response = await apiClient.get("/api/user/settings");
    return response.data.settings;
  } catch (error) {
    console.error("Error fetching user settings:", error);
    throw error;
  }
};

const updateUserSettings = async (settings) => {
  if (isTestMode) {
    console.log('Test mode: Simulating settings update');
    return { success: true, settings };
  }
  try {
    const response = await apiClient.put("/api/user/settings", settings);
    return response.data;
  } catch (error) {
    console.error("Error updating user settings:", error);
    throw error;
  }
};

// Favorites endpoints
const getFavorites = async () => {
  if (isTestMode) {
    console.log('Test mode: Returning test favorites');
    return [];
  }
  try {
    const response = await apiClient.get("/api/favorites");
    return response.data.favorites;
  } catch (error) {
    console.error("Error fetching favorites:", error);
    throw error;
  }
};

const addFavorite = async (restaurant) => {
  if (isTestMode) {
    console.log('Test mode: Simulating adding favorite');
    return { success: true, restaurant };
  }
  try {
    const response = await apiClient.post("/api/favorites", restaurant);
    return response.data;
  } catch (error) {
    console.error("Error adding favorite:", error);
    throw error;
  }
};

const removeFavorite = async (placeId) => {
  if (isTestMode) {
    console.log('Test mode: Simulating removing favorite');
    return { success: true };
  }
  try {
    const response = await apiClient.delete(`/api/favorites?place_id=${placeId}`);
    return response.data;
  } catch (error) {
    console.error("Error removing favorite:", error);
    throw error;
  }
};

// Restaurant endpoints
const getNearbyRestaurants = async (
  sessionId,
  latitude,
  longitude,
  radius = 1000,
) => {
  // Only use test data if explicitly in test mode
  if (isTestMode) {
    console.log('Test mode: Loading test restaurants');
    if (restaurantData.length === 0) {
      await loadTestData();
    }
    // Return the data in the same format as the API
    return { 
      restaurants: restaurantData,
      total: restaurantData.length
    };
  }

  // For both regular and demo users, use the real API
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

const getNextRestaurant = async (sessionId) => {
  // Only use test data if explicitly in test mode
  if (isTestMode) {
    console.log('Test mode: Getting next test restaurant');
    if (restaurantData.length === 0) {
      await loadTestData();
    }
    const nextRestaurant = getNextTestRestaurant();
    if (!nextRestaurant) {
      throw new Error('No restaurants available');
    }
    return { 
      restaurant: nextRestaurant,
      total: restaurantData.length,
      current: currentIndex
    };
  }

  // For both regular and demo users, use the real API
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

const resetSession = async (sessionId) => {
  if (isTestMode) {
    console.log('Test mode: Simulating session reset');
    return { success: true };
  }
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
const getPhotoUrl = (photoReference, maxWidth = 400) => {
  // Only use test photos if explicitly in test mode
  if (isTestMode) {
    console.log('Test mode: Returning test photo URL');
    return `https://via.placeholder.com/${maxWidth}`;
  }
  // For both regular and demo users, use the real API
  return `${API_BASE_URL}/api/photo?photo_reference=${photoReference}&max_width=${maxWidth}`;
};

module.exports = {
  setTestMode,
  login,
  signup,
  getUserSettings,
  updateUserSettings,
  getFavorites,
  addFavorite,
  removeFavorite,
  getNearbyRestaurants,
  getNextRestaurant,
  resetSession,
  getPhotoUrl
};
