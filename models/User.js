import * as Location from "expo-location";
import AsyncStorage from "@react-native-async-storage/async-storage";

class User {
  constructor(data) {
    // Basic user info
    this.id = data.id || '';
    this.username = data.username || '';
    this.displayName = data.displayName || '';
    this.token = data.token || null;
    this.location = null;
    this.hasInitializedLocation = false;
    this.profilePicture = data.profilePicture || 'default';

    // User preferences and settings
    this.settings = {
      cuisinePreferences: data.settings?.cuisinePreferences || [],
      priceRange: data.settings?.priceRange || [1, 4], // Default: all price ranges
      radius: data.settings?.radius || 1000, // Default: 1km
      ...data.settings
    };

    // Favorites
    this.favorites = data.favorites || [];
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
      throw error;
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

      throw error;
    }
  }

  // Instance method to update location
  async updateLocation() {
    try {
      this.location = await User.getLocation();
      this.hasInitializedLocation = true;
      return this.location;
    } catch (error) {
      console.error("Failed to update location:", error);
      throw new Error('Location access is required to use this app. Please enable location services and try again.');
    }
  }

  // Authentication methods
  static async login(username, password) {
    try {
      const response = await fetch('http://localhost:5000/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
      });

      if (!response.ok) {
        throw new Error('Login failed');
      }

      const data = await response.json();
      return new User({
        id: data.id,
        username: data.username,
        displayName: data.displayName,
        profilePicture: data.profilePicture,
        settings: data.settings
      });
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  }

  static async signup(username, password, displayName) {
    try {
      const response = await fetch('http://localhost:5000/api/auth/signup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password, displayName }),
      });

      if (!response.ok) {
        throw new Error('Signup failed');
      }

      const data = await response.json();
      return new User({
        id: data.id,
        username: data.username,
        displayName: data.displayName,
        profilePicture: data.profilePicture,
        settings: data.settings
      });
    } catch (error) {
      console.error('Signup error:', error);
      throw error;
    }
  }

  // Settings methods
  async updateSettings(newSettings) {
    try {
      const response = await fetch('http://localhost:5001/api/user/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.token}`,
        },
        body: JSON.stringify(newSettings),
      });

      if (!response.ok) {
        throw new Error('Failed to update settings');
      }

      this.settings = {
        ...this.settings,
        ...newSettings,
      };
      return true;
    } catch (error) {
      console.error('Error updating settings:', error);
      throw error;
    }
  }

  // Favorites methods
  async getFavorites() {
    try {
      const response = await fetch('http://localhost:5001/api/favorites', {
        headers: {
          'Authorization': `Bearer ${this.token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch favorites');
      }

      const data = await response.json();
      this.favorites = data.favorites;
      return this.favorites;
    } catch (error) {
      console.error('Error fetching favorites:', error);
      throw error;
    }
  }

  async addFavorite(restaurant) {
    try {
      const response = await fetch('http://localhost:5001/api/favorites', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.token}`,
        },
        body: JSON.stringify(restaurant),
      });

      if (!response.ok) {
        throw new Error('Failed to add favorite');
      }

      await this.getFavorites(); // Refresh favorites list
      return true;
    } catch (error) {
      console.error('Error adding favorite:', error);
      throw error;
    }
  }

  async removeFavorite(placeId) {
    try {
      const response = await fetch(`http://localhost:5001/api/favorites?place_id=${placeId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${this.token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to remove favorite');
      }

      await this.getFavorites(); // Refresh favorites list
      return true;
    } catch (error) {
      console.error('Error removing favorite:', error);
      throw error;
    }
  }

  async updateProfile(updates) {
    try {
      const response = await fetch('http://localhost:5000/api/user/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await this.getToken()}`,
        },
        body: JSON.stringify(updates),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update profile');
      }

      const data = await response.json();
      if (updates.profilePicture) {
        this.profilePicture = updates.profilePicture;
      }
      if (updates.displayName) {
        this.displayName = updates.displayName;
      }
      return data;
    } catch (error) {
      console.error('Profile update error:', error);
      throw error;
    }
  }

  // Convert to plain object for storage
  toJSON() {
    return {
      id: this.id,
      username: this.username,
      displayName: this.displayName,
      profilePicture: this.profilePicture,
      settings: this.settings,
      favorites: this.favorites,
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
