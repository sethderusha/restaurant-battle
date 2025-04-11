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
      const response = await fetch('http://localhost:5001/api/auth/login', {
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
        settings: data.settings,
        token: data.token
      });
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  }

  static async signup(username, password, displayName) {
    try {
      const response = await fetch('http://localhost:5001/api/auth/signup', {
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
        settings: data.settings,
        token: data.token
      });
    } catch (error) {
      console.error('Signup error:', error);
      throw error;
    }
  }

  // Helper method to get the token
  getToken() {
    if (!this.token) {
      throw new Error('No authentication token available. Please log in again.');
    }
    return this.token;
  }

  // Settings methods
  async updateSettings(newSettings) {
    try {
      const response = await fetch('http://localhost:5001/api/user/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.getToken()}`,
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
      console.log('🔍 Getting favorites for user:', this.username);
      console.log('🔑 Using token:', this.token);
      
      const url = 'http://localhost:5001/api/favorites';
      console.log('📡 Making GET request to:', url);
      
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${this.getToken()}`,
        },
      });

      console.log('📥 GET Response status:', response.status);
      console.log('📥 GET Response headers:', JSON.stringify(Object.fromEntries([...response.headers]), null, 2));
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        console.error('❌ GET Error response:', errorData);
        throw new Error('Failed to fetch favorites');
      }

      const data = await response.json();
      console.log('✅ GET Response data:', JSON.stringify(data, null, 2));
      
      // Transform the favorites data to match the Restaurant model structure
      this.favorites = data.favorites.map(fav => {
        // Check if the picture is a photo reference or a full URL
        const isPhotoReference = fav.picture && !fav.picture.startsWith('http');
        
        return {
          id: fav.place_id,
          place_id: fav.place_id,
          name: fav.name,
          vicinity: fav.address,
          address: fav.address,
          rating: fav.rating,
          price_level: fav.price,
          // Keep the original picture value (could be a photo reference or full URL)
          picture: fav.picture,
          // If it's a photo reference, add it to photos array
          photos: isPhotoReference ? [{ photo_reference: fav.picture }] : []
        };
      });
      
      console.log('🔄 Transformed favorites:', JSON.stringify(this.favorites, null, 2));
      return this.favorites;
    } catch (error) {
      console.error('❌ Error in getFavorites:', error);
      throw error;
    }
  }

  async addFavorite(restaurant) {
    try {
      console.log('➕ Adding favorite:', restaurant.name);
      console.log('🔑 Using token:', this.token);
      
      // Transform the restaurant data to match the backend's expected structure
      const favoriteData = {
        place_id: restaurant.id || restaurant.place_id,
        name: restaurant.name,
        picture: restaurant.photos?.[0]?.photo_reference || restaurant.picture || null,
        address: restaurant.vicinity || restaurant.address || null,
        rating: restaurant.rating || null,
        price: restaurant.price_level || restaurant.price || null
      };
      
      const url = 'http://localhost:5001/api/favorites';
      console.log('📡 Making POST request to:', url);
      console.log('📦 POST Request body:', JSON.stringify(favoriteData, null, 2));
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.getToken()}`,
        },
        body: JSON.stringify(favoriteData),
      });

      console.log('📥 POST Response status:', response.status);
      console.log('📥 POST Response headers:', JSON.stringify(Object.fromEntries([...response.headers]), null, 2));
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        console.error('❌ POST Error response:', errorData);
        throw new Error('Failed to add favorite');
      }

      const data = await response.json();
      console.log('✅ POST Response data:', JSON.stringify(data, null, 2));
      
      console.log('✅ Favorite added successfully');
      await this.getFavorites(); // Refresh favorites list
      return true;
    } catch (error) {
      console.error('❌ Error in addFavorite:', error);
      throw error;
    }
  }

  async removeFavorite(placeId) {
    try {
      console.log('➖ Removing favorite with place_id:', placeId);
      console.log('🔑 Using token:', this.token);
      
      const url = `http://localhost:5001/api/favorites?place_id=${placeId}`;
      console.log('📡 Making DELETE request to:', url);
      
      const response = await fetch(url, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${this.getToken()}`,
        },
      });

      console.log('📥 DELETE Response status:', response.status);
      console.log('📥 DELETE Response headers:', JSON.stringify(Object.fromEntries([...response.headers]), null, 2));
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        console.error('❌ DELETE Error response:', errorData);
        throw new Error('Failed to remove favorite');
      }

      const data = await response.json();
      console.log('✅ DELETE Response data:', JSON.stringify(data, null, 2));
      
      console.log('✅ Favorite removed successfully');
      await this.getFavorites(); // Refresh favorites list
      return true;
    } catch (error) {
      console.error('❌ Error in removeFavorite:', error);
      throw error;
    }
  }

  async updateProfile(updates) {
    try {
      const response = await fetch('http://localhost:5001/api/user/settings', {
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
      token: this.token
    };
  }

  // Create User instance from stored data
  static fromJSON(data) {
    return new User(data);
  }
}

export default User;
