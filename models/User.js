import * as Location from "expo-location";
import AsyncStorage from "@react-native-async-storage/async-storage";

class User {
  constructor(data = {}) {
    // Basic user info
    this.id = data.id || '';
    this.username = data.username || '';
    this.displayName = data.displayName || '';
    this.location = null;
    this.hasInitializedLocation = false;

    // User preferences
    this.preferences = {
      cuisinePreferences: data.preferences?.cuisinePreferences || [],
      priceRange: data.preferences?.priceRange || [1, 4], // Default: all price ranges
      radius: data.preferences?.radius || 1000, // Default: 1km
    };

    // Battle history
    this.battleHistory = data.battleHistory || [];
  }

  // Static method to request location permissions
  static async requestLocationPermission() {
    try {
      console.log("📱 Requesting location permissions...");
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        throw new Error('Location permission is required to use this app. Please enable location access in your device settings.');
      }
      return true;
    } catch (error) {
      console.error("❌ Error requesting location permission:", error.message);
      throw error; // Propagate the error up
    }
  }

  // Static method for getting location
  static async getLocation(retryCount = 0) {
    try {
      // First check if we already have permissions
      const { status: existingStatus } = await Location.getForegroundPermissionsAsync();
      
      // If we don't have permission, request it
      if (existingStatus !== 'granted') {
        await User.requestLocationPermission();
      }

      // Check if location services are enabled
      const enabled = await Location.hasServicesEnabledAsync();
      if (!enabled) {
        throw new Error('Location services are disabled. Please enable them in your device settings to use this app.');
      }

      console.log("📡 Getting current location...");
      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
        timeout: 15000,
      });

      if (!position || !position.coords) {
        throw new Error('Could not get location coordinates. Please ensure you have a clear view of the sky and try again.');
      }

      console.log("✅ Location retrieved successfully");
      return {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      };
    } catch (error) {
      console.error("❌ Error getting location:", error.message);

      if (retryCount < 3) {
        console.log(`🔄 Retrying... (Attempt ${retryCount + 1}/3)`);
        await new Promise(resolve => setTimeout(resolve, 2000));
        return User.getLocation(retryCount + 1);
      }

      throw error; // Let the calling code handle the error
    }
  }

  // Static method for fallback location
  static fallbackLocation() {
    console.log("Using fallback location (NYC)");
    return { 
      latitude: 40.7128, 
      longitude: -74.006,
      isFallback: true 
    };
  }

  // Instance method to update location
  async updateLocation() {
    try {
      // Get location with retries
      this.location = await User.getLocation();
      this.hasInitializedLocation = true;
      return this.location;
    } catch (error) {
      console.error("Failed to update location:", error);
      throw error; // Propagate the error up
    }
  }

  // Battle history methods
  addBattleResult(winner, loser) {
    this.battleHistory.push({
      winner,
      loser,
      timestamp: Date.now()
    });
  }

  getBattleHistory() {
    return this.battleHistory;
  }

  // User preference methods
  updatePreferences(newPreferences) {
    this.preferences = {
      ...this.preferences,
      ...newPreferences
    };
  }

  addCuisinePreference(cuisine) {
    if (!this.preferences.cuisinePreferences.includes(cuisine)) {
      this.preferences.cuisinePreferences.push(cuisine);
    }
  }

  removeCuisinePreference(cuisine) {
    this.preferences.cuisinePreferences = this.preferences.cuisinePreferences
      .filter(c => c !== cuisine);
  }

  setPriceRange(min, max) {
    this.preferences.priceRange = [min, max];
  }

  setRadius(radius) {
    this.preferences.radius = radius;
  }

  // Convert to plain object for storage
  toJSON() {
    return {
      id: this.id,
      username: this.username,
      displayName: this.displayName,
      preferences: this.preferences,
      battleHistory: this.battleHistory,
      location: this.location,
      hasInitializedLocation: this.hasInitializedLocation,
    };
  }

  // Create User instance from stored data
  static fromJSON(data) {
    return new User(data);
  }
}

export default User;
