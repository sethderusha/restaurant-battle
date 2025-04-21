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
    this.isDemoUser = data.isDemoUser || false;

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

  // Check if this is a demo user
  isDemo() {
    return this.isDemoUser || this.id === 'demo-user' || this.username === 'demo';
  }

  // Static method to request location permissions
  static async requestLocationPermission() {
    try {
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

      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
        timeout: 15000,
      });

      if (!position || !position.coords) {
        throw new Error('Could not get location coordinates. Please ensure you have a clear view of the sky and try again.');
      }

      return {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      };
    } catch (error) {
      console.error("❌ Error getting location:", error.message);

      if (retryCount < 3) {
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

  // Get the authentication token
  getToken() {
    if (this.isDemo()) {
      return 'demo-token';
    }
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

  // Get favorites
  async getFavorites() {
    try {
      if (this.isDemo()) {
        console.log('Demo mode: Getting favorites from AsyncStorage');
        const storage = await AsyncStorage.getItem('demo_favorites');
        this.favorites = storage ? JSON.parse(storage) : [];
        return this.favorites;
      }
      
      const response = await fetch(`${API_URL}/favorites`, {
        headers: {
          'Authorization': `Bearer ${this.getToken()}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        console.error('❌ GET Error response:', errorData);
        throw new Error('Failed to fetch favorites');
      }

      const data = await response.json();
      console.log('📍 Raw favorites data from backend:', data.favorites);

      // Transform the data to ensure location is properly structured
      this.favorites = (data.favorites || []).map(favorite => {
        // If we have lat/lng, ensure they're properly structured in a location object
        if (favorite.lat !== undefined && favorite.lng !== undefined) {
          return {
            ...favorite,
            location: {
              latitude: favorite.lat,
              longitude: favorite.lng
            }
          };
        }
        return favorite;
      });

      console.log('📍 Transformed favorites data:', this.favorites);
      return this.favorites;
    } catch (error) {
      console.error('❌ Error in getFavorites:', error);
      throw error;
    }
  }

  // Add favorite
  async addFavorite(restaurant) {
    try {
      if (this.isDemo()) {
        console.log('Demo mode: Adding favorite to AsyncStorage');
        const storage = await AsyncStorage.getItem('demo_favorites');
        let favorites = storage ? JSON.parse(storage) : [];
        
        // Check if restaurant is already in favorites
        if (!favorites.some(fav => fav.place_id === restaurant.place_id)) {
          favorites.push({
            ...restaurant,
            added_at: new Date().toISOString() // Add timestamp to match regular API behavior
          });
          await AsyncStorage.setItem('demo_favorites', JSON.stringify(favorites));
          this.favorites = favorites;
        }
        return this.favorites;
      }

      // Transform location data to match backend expectations
      const restaurantData = {
        ...restaurant,
        lat: restaurant.location?.latitude,
        lng: restaurant.location?.longitude,
      };

      console.log('📍 Sending favorite to backend:', {
        name: restaurantData.name,
        lat: restaurantData.lat,
        lng: restaurantData.lng,
        location: restaurant.location,
        fullData: restaurantData
      });

      const response = await fetch(`${API_URL}/favorites`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.getToken()}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(restaurantData)
      });

      if (!response.ok) {
        throw new Error('Failed to add favorite');
      }

      await this.getFavorites(); // Refresh favorites list
      return this.favorites;
    } catch (error) {
      console.error('❌ Error in addFavorite:', error);
      throw error;
    }
  }

  // Remove favorite
  async removeFavorite(placeId) {
    try {
      if (this.isDemo()) {
        console.log('Demo mode: Removing favorite from AsyncStorage');
        const storage = await AsyncStorage.getItem('demo_favorites');
        let favorites = storage ? JSON.parse(storage) : [];
        favorites = favorites.filter(fav => fav.place_id !== placeId);
        await AsyncStorage.setItem('demo_favorites', JSON.stringify(favorites));
        this.favorites = favorites;
        return this.favorites;
      }

      const response = await fetch(`${API_URL}/favorites?place_id=${placeId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${this.getToken()}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to remove favorite');
      }

      await this.getFavorites(); // Refresh favorites list
      return this.favorites;
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

  // Get playlists
  async getPlaylists() {
    try {
      if (this.isDemo()) {
        console.log('Demo mode: Getting playlists from AsyncStorage');
        const storage = await AsyncStorage.getItem('demo_playlists');
        return storage ? JSON.parse(storage) : [];
      }

      const response = await fetch(`${API_URL}/playlists`, {
        headers: {
          'Authorization': `Bearer ${this.getToken()}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch playlists');
      }

      const data = await response.json();
      return data.playlists || [];
    } catch (error) {
      console.error('Error fetching playlists:', error);
      throw error;
    }
  }

  // Create playlist
  async createPlaylist(name) {
    try {
      if (this.isDemo()) {
        console.log('Demo mode: Creating playlist in AsyncStorage');
        const storage = await AsyncStorage.getItem('demo_playlists');
        let playlists = storage ? JSON.parse(storage) : [];
        
        const newPlaylist = {
          id: `demo-playlist-${Date.now()}`,
          name,
          items: [],
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
        
        playlists.push(newPlaylist);
        await AsyncStorage.setItem('demo_playlists', JSON.stringify(playlists));
        return newPlaylist;
      }

      const response = await fetch(`${API_URL}/playlists`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.getToken()}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ name })
      });

      if (!response.ok) {
        throw new Error('Failed to create playlist');
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error creating playlist:', error);
      throw error;
    }
  }

  // Get playlist items
  async getPlaylistItems(playlistId) {
    try {
      if (this.isDemo()) {
        console.log('Demo mode: Getting playlist items from AsyncStorage');
        const storage = await AsyncStorage.getItem('demo_playlists');
        if (storage) {
          const playlists = JSON.parse(storage);
          const playlist = playlists.find(p => p.id === playlistId);
          return playlist ? playlist.items : [];
        }
        return [];
      }

      const response = await fetch(`${API_URL}/playlists/${playlistId}`, {
        headers: {
          'Authorization': `Bearer ${this.getToken()}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch playlist items');
      }

      const data = await response.json();
      return data.items || [];
    } catch (error) {
      console.error('Error fetching playlist items:', error);
      throw error;
    }
  }

  // Add to playlist
  async addToPlaylist(playlistId, restaurant) {
    try {
      if (this.isDemo()) {
        console.log('Demo mode: Adding to playlist in AsyncStorage');
        const storage = await AsyncStorage.getItem('demo_playlists');
        let playlists = storage ? JSON.parse(storage) : [];
        const playlistIndex = playlists.findIndex(p => p.id === playlistId);
        
        if (playlistIndex === -1) {
          throw new Error('Playlist not found');
        }

        // Check if restaurant is already in playlist
        if (!playlists[playlistIndex].items.some(item => item.place_id === restaurant.place_id)) {
          const restaurantWithTimestamp = {
            ...restaurant,
            added_at: new Date().toISOString()
          };
          playlists[playlistIndex].items.push(restaurantWithTimestamp);
          playlists[playlistIndex].updated_at = new Date().toISOString();
          await AsyncStorage.setItem('demo_playlists', JSON.stringify(playlists));
        }
        return playlists[playlistIndex];
      }

      const response = await fetch(`${API_URL}/playlists/${playlistId}/items`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.getToken()}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(restaurant)
      });

      if (!response.ok) {
        throw new Error('Failed to add to playlist');
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error adding to playlist:', error);
      throw error;
    }
  }

  // Remove from playlist
  async removeFromPlaylist(playlistId, placeId) {
    try {
      if (this.isDemo()) {
        console.log('Demo mode: Removing from playlist in AsyncStorage');
        const storage = await AsyncStorage.getItem('demo_playlists');
        if (storage) {
          let playlists = JSON.parse(storage);
          const playlistIndex = playlists.findIndex(p => p.id === playlistId);
          
          if (playlistIndex !== -1) {
            playlists[playlistIndex].items = playlists[playlistIndex].items.filter(
              item => item.place_id !== placeId
            );
            await AsyncStorage.setItem('demo_playlists', JSON.stringify(playlists));
            return true;
          }
        }
        throw new Error('Playlist not found');
      }

      const response = await fetch(`${API_URL}/playlists/${playlistId}/items?place_id=${placeId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${this.getToken()}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to remove from playlist');
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error removing from playlist:', error);
      throw error;
    }
  }

  // Delete playlist
  async deletePlaylist(playlistId) {
    try {
      if (this.isDemo()) {
        console.log('Demo mode: Deleting playlist from AsyncStorage');
        const storage = await AsyncStorage.getItem('demo_playlists');
        if (storage) {
          let playlists = JSON.parse(storage);
          playlists = playlists.filter(p => p.id !== playlistId);
          await AsyncStorage.setItem('demo_playlists', JSON.stringify(playlists));
          return true;
        }
        throw new Error('Playlist not found');
      }

      const response = await fetch(`${API_URL}/playlists/${playlistId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${this.getToken()}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to delete playlist');
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
      token: this.token,
      isDemoUser: this.isDemoUser
    };
  }

  // Create User instance from stored data
  static fromJSON(data) {
    return new User(data);
  }
}

export default User;
