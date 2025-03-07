// api/api.js
import axios from "axios";

// Replace with your Flask server URL
// Use IP address instead of localhost for device testing
const API_BASE_URL = "http://localhost:5001"; // Change this to your computer's IP address

// Create axios instance
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    "Content-Type": "application/json",
  },
});

// API functions that match your Flask endpoints
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
