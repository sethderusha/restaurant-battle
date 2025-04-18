import * as Location from "expo-location";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { API_URL } from '@/config';

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
      // Instead of throwing an error, return null to indicate failure
      // This allows the UI to handle the failure and prompt for manual input
      return null;
    }
  }

  // Method to set manual location
  setManualLocation(latitude, longitude) {
    if (typeof latitude !== 'number' || typeof longitude !== 'number') {
      throw new Error('Latitude and longitude must be numbers');
    }
    
    if (latitude < -90 || latitude > 90) {
      throw new Error('Latitude must be between -90 and 90');
    }
    
    if (longitude < -180 || longitude > 180) {
      throw new Error('Longitude must be between -180 and 180');
    }
    
    this.location = {
      latitude,
      longitude
    };
    this.hasInitializedLocation = true;
    return this.location;
  }

  // Authentication methods
  static async login(username, password) {
    try {
      const response = await fetch(`${API_URL}/auth/login`, {
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
      const response = await fetch(`${API_URL}/auth/signup`, {
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
      const response = await fetch(`${API_URL}/user/settings`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${this.getToken()}`,
          'Content-Type': 'application/json',
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
      
      const url = `${API_URL}/favorites`;
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
          lat: fav.lat,
          lng: fav.lng,
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
        price: restaurant.price_level || restaurant.price || null,
        lat: restaurant.location?.latitude || restaurant.lat || restaurant.latitude || null,
        lng: restaurant.location?.longitude || restaurant.lng || restaurant.longitude || null
      };
      
      const url = `${API_URL}/favorites`;
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
      
      const url = `${API_URL}/favorites?place_id=${placeId}`;
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
      const response = await fetch(`${API_URL}/user/settings`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${this.getToken()}`,
          'Content-Type': 'application/json',
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

  // Playlist methods
  async getPlaylists() {
    try {
      const response = await fetch(`${API_URL}/playlists`, {
        headers: {
          'Authorization': `Bearer ${this.getToken()}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch playlists');
      }

      const data = await response.json();
      return data.playlists;
    } catch (error) {
      console.error('Error fetching playlists:', error);
      throw error;
    }
  }

  async createPlaylist(name) {
    try {
      const response = await fetch(`${API_URL}/playlists`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.getToken()}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create playlist');
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error creating playlist:', error);
      throw error;
    }
  }

  async getPlaylistItems(playlistId) {
    try {
      const response = await fetch(`${API_URL}/playlists/${playlistId}`, {
        headers: {
          'Authorization': `Bearer ${this.getToken()}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch playlist items');
      }

      const data = await response.json();
      return (data.items || []).map(item => ({
        id: item.place_id,
        place_id: item.place_id,
        name: item.name,
        vicinity: item.address,
        address: item.address,
        rating: item.rating,
        price_level: item.price,
        lat: item.lat,
        lng: item.lng,
        picture: item.picture,
        photos: item.picture && !item.picture.startsWith('http') ? [{ photo_reference: item.picture }] : []
      }));
    } catch (error) {
      console.error('Error fetching playlist items:', error);
      throw error;
    }
  }

  async addToPlaylist(playlistId, restaurant) {
    try {
      // Prepare restaurant data with location information
      const restaurantData = {
        place_id: restaurant.place_id || restaurant.id,
        name: restaurant.name,
        picture: restaurant.picture,
        address: restaurant.address || restaurant.vicinity,
        rating: restaurant.rating,
        price: restaurant.price_level,
        lat: restaurant.lat || restaurant.location?.lat,
        lng: restaurant.lng || restaurant.location?.lng
      };

      const response = await fetch(`${API_URL}/playlists/${playlistId}/items`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.getToken()}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(restaurantData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to add to playlist');
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error adding to playlist:', error);
      throw error;
    }
  }

  async removeFromPlaylist(playlistId, placeId) {
    try {
      const response = await fetch(`${API_URL}/playlists/${playlistId}/items?place_id=${placeId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${this.getToken()}`,
        },
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to remove from playlist');
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error removing from playlist:', error);
      throw error;
    }
  }

  async deletePlaylist(playlistId) {
    try {
      const response = await fetch(`${API_URL}/playlists/${playlistId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${this.getToken()}`,
        },
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete playlist');
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error deleting playlist:', error);
      throw error;
    }
  }

  async searchRestaurants(query) {
    try {
      const response = await fetch(`${API_URL}/restaurants/search?query=${encodeURIComponent(query)}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.getToken()}`,
        },
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to search restaurants');
      }

      const data = await response.json();
      return data.results;
    } catch (error) {
      console.error('Error searching restaurants:', error);
      throw error;
    }
  }

  /**
   * Add a restaurant to favorites manually
   * @param {string|null} placeId - Google Places API place_id
   * @returns {Promise<Object>} - Response data
   */
  async addManualFavorite(placeId) {
    try {
      const response = await fetch(`${API_URL}/favorites/manual`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.getToken()}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ place_id: placeId }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to add favorite');
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error adding manual favorite:', error);
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
