import * as Location from "expo-location";
import AsyncStorage from "@react-native-async-storage/async-storage";

class User {
  constructor(data = {}) {
    // Basic user info
    this.id = data.id || '';
    this.username = data.username || '';
    this.displayName = data.displayName || '';
    this.location = null;

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
      const response = await Location.requestForegroundPermissionsAsync();
      return response.status === 'granted';
    } catch (error) {
      console.error("❌ Error requesting location permission:", error.message);
      return false;
    }
  }

  // Static method for getting location
  static async getLocation(retryCount = 0) {
    try {
      console.log("🔍 Checking location permissions...");
      const { status } = await Location.getForegroundPermissionsAsync();

      if (status !== 'granted') {
        console.log("⚠️ Location permission not granted");
        return User.fallbackLocation();
      }

      console.log("📡 Getting current location...");
      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
        timeout: 10000,
      });

      console.log("✅ Location retrieved successfully");
      return {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      };
    } catch (error) {
      console.error("❌ Error getting location:", error.message);

      if (retryCount < 2) {
        console.log(`🔄 Retrying... (Attempt ${retryCount + 1}/2)`);
        await new Promise(resolve => setTimeout(resolve, 1000));
        return User.getLocation(retryCount + 1);
      }

      console.error("❌ Failed to get location after multiple attempts");
      return User.fallbackLocation();
    }
  }

  // Static method for fallback location
  static fallbackLocation() {
    console.warn("⚠️ Using fallback location as last resort");
    return { latitude: 40.7128, longitude: -74.006 }; // Default to NYC
  }

  // Instance method to update location
  async updateLocation() {
    // First ensure we have permission
    const hasPermission = await User.requestLocationPermission();
    if (hasPermission) {
      this.location = await User.getLocation();
    } else {
      this.location = User.fallbackLocation();
    }
    return this.location;
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
    };
  }

  // Create User instance from stored data
  static fromJSON(data) {
    return new User(data);
  }
}

export default User;
