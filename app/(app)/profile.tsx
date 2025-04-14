import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Modal, Image, Linking, RefreshControl, ActivityIndicator } from 'react-native';
import { useAuth } from '@/context/AuthContext';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Restaurant from '@/models/Restaurant';
import { API_URL } from '@/config';
import { getPhotoUrl } from '@/api/api';
import { GoogleMapView } from '@/components/GoogleMapView';

const PROFILE_PICTURES = [
  { id: 'burger', name: 'Burger', source: require('@/assets/images/pfps/burger.png') },
  { id: 'dumpling', name: 'Dumpling', source: require('@/assets/images/pfps/dumpling.png') },
  { id: 'gyro', name: 'Gyro', source: require('@/assets/images/pfps/gyro.png') },
  { id: 'sushi', name: 'Sushi', source: require('@/assets/images/pfps/sushi.png') },
];

export default function ProfileScreen() {
  const { user, signOut, updateUserProfile } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [displayName, setDisplayName] = useState(user?.displayName || '');
  const [username, setUsername] = useState(user?.username || '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [showProfilePictures, setShowProfilePictures] = useState(false);
  const [selectedPicture, setSelectedPicture] = useState(user?.profilePicture || 'default');
  const [favorites, setFavorites] = useState<Restaurant[]>([]);
  const [loadingFavorites, setLoadingFavorites] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [playlists, setPlaylists] = useState<any[]>([]);
  const [loadingPlaylists, setLoadingPlaylists] = useState(false);
  const [showCreatePlaylist, setShowCreatePlaylist] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [selectedPlaylist, setSelectedPlaylist] = useState<any>(null);
  const [playlistItems, setPlaylistItems] = useState<Restaurant[]>([]);
  const [loadingPlaylistItems, setLoadingPlaylistItems] = useState(false);
  const [showAddManualFavorite, setShowAddManualFavorite] = useState(false);
  const [manualFavoriteUrl, setManualFavoriteUrl] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [dataLoaded, setDataLoaded] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedPlaceId, setSelectedPlaceId] = useState<string | null>(null);
  const [showAddToPlaylist, setShowAddToPlaylist] = useState(false);
  const [selectedFavorite, setSelectedFavorite] = useState<Restaurant | null>(null);
  const [showPlaylistDropdown, setShowPlaylistDropdown] = useState(false);

  // Load favorites and playlists when the screen is focused
  useFocusEffect(
    useCallback(() => {
      const loadData = async () => {
        if (!user) {
          console.log('❌ Cannot load data: No user logged in');
          return;
        }

        try {
          setLoadingFavorites(true);
          setLoadingPlaylists(true);
          setError(null);
          
          // Load favorites
          const favoritesResponse = await fetch(`${API_URL}/favorites`, {
            headers: {
              'Authorization': `Bearer ${user.token}`,
              'Content-Type': 'application/json'
            }
          });

          if (!favoritesResponse.ok) {
            throw new Error('Failed to load favorites');
          }

          const favoritesData = await favoritesResponse.json();
          setFavorites(favoritesData.favorites || []);

          // Load playlists
          const playlistsResponse = await fetch(`${API_URL}/playlists`, {
            headers: {
              'Authorization': `Bearer ${user.token}`,
              'Content-Type': 'application/json'
            }
          });

          if (!playlistsResponse.ok) {
            throw new Error('Failed to load playlists');
          }

          const playlistsData = await playlistsResponse.json();
          setPlaylists(playlistsData.playlists || []);
        } catch (err) {
          console.error('❌ Error loading data:', err);
          setError(err instanceof Error ? err.message : 'Failed to load data');
        } finally {
          setLoadingFavorites(false);
          setLoadingPlaylists(false);
          setRefreshing(false);
        }
      };

      loadData();
    }, [user, refreshing])
  );

  const handleSelectPlaylist = useCallback(async (playlist: any) => {
    if (!user) return;
    
    // If the clicked playlist is already selected, deselect it
    if (selectedPlaylist && selectedPlaylist.id === playlist.id) {
      console.log('🔍 Deselecting playlist:', playlist.id, playlist.name);
      setSelectedPlaylist(null);
      setPlaylistItems([]);
      return;
    }
    
    console.log('🔍 Selecting playlist:', playlist.id, playlist.name);
    setSelectedPlaylist(playlist);
    setLoadingPlaylistItems(true);
    setError(null);

    try {
      console.log('📡 Fetching playlist items for:', playlist.id);
      const items = await user.getPlaylistItems(playlist.id);
      console.log('✅ Received playlist items:', items.length);
      setPlaylistItems(items);
    } catch (err) {
      console.error('❌ Error loading playlist items:', err);
      setError(err instanceof Error ? err.message : 'Failed to load playlist items');
    } finally {
      console.log('🏁 Finished loading playlist items');
      setLoadingPlaylistItems(false);
    }
  }, [user, selectedPlaylist]);

  const handleRemoveFromPlaylist = useCallback(async (placeId: string, playlistId: number) => {
    if (!user) return;
    
    try {
      setError(null);
      await user.removeFromPlaylist(playlistId, placeId);
      
      // Refresh playlist items if the playlist is selected
      if (selectedPlaylist && selectedPlaylist.id === playlistId) {
        const updatedItems = await user.getPlaylistItems(playlistId);
        setPlaylistItems(updatedItems);
      }
    } catch (err) {
      console.error('Error removing from playlist:', err);
      setError(err instanceof Error ? err.message : 'Failed to remove from playlist');
    }
  }, [user, selectedPlaylist]);

  const handleDeletePlaylist = useCallback(async (playlistId: number) => {
    if (!user) return;
    
    try {
      setError(null);
      await user.deletePlaylist(playlistId);
      
      // Refresh playlists
      const updatedPlaylists = await user.getPlaylists();
      setPlaylists(updatedPlaylists);
      
      // Clear selected playlist if it was deleted
      if (selectedPlaylist && selectedPlaylist.id === playlistId) {
        setSelectedPlaylist(null);
        setPlaylistItems([]);
      }
    } catch (err) {
      console.error('Error deleting playlist:', err);
      setError(err instanceof Error ? err.message : 'Failed to delete playlist');
    }
  }, [user, selectedPlaylist]);

  const refreshPlaylistItems = useCallback(async () => {
    if (!user || !selectedPlaylist) return;
    
    console.log('🔄 Refreshing playlist items for:', selectedPlaylist.id);
    setLoadingPlaylistItems(true);
    
    try {
      const items = await user.getPlaylistItems(selectedPlaylist.id);
      console.log('✅ Refreshed playlist items:', items.length);
      setPlaylistItems(items);
    } catch (err) {
      console.error('❌ Error refreshing playlist items:', err);
      setError(err instanceof Error ? err.message : 'Failed to refresh playlist items');
    } finally {
      setLoadingPlaylistItems(false);
    }
  }, [user, selectedPlaylist]);

  // Memoize the playlist items rendering
  const renderPlaylistItems = useCallback((playlistId: number) => {
    if (loadingPlaylistItems) {
      return <Text style={styles.emptyText}>Loading playlist items...</Text>;
    }

    if (!playlistItems || playlistItems.length === 0) {
      return <Text style={styles.emptyText}>No items in this playlist</Text>;
    }

    return (
      <View style={styles.playlistItemsList}>
        {playlistItems.map((restaurant) => (
          <View key={restaurant.place_id} style={styles.favoriteItemContainer}>
            <TouchableOpacity
              style={styles.favoriteItem}
              onPress={() => {
                const url = `https://www.google.com/maps/place/?q=place_id:${restaurant.place_id}`;
                Linking.openURL(url).catch((err) => {
                  console.error('❌ Error opening Maps:', err);
                  setError('Failed to open restaurant location');
                });
              }}
            >
              <Image
                source={{ uri: getPhotoUrl(restaurant.picture) }}
                style={styles.favoriteImage}
                onError={(e) => console.error('❌ Error loading image:', e.nativeEvent.error)}
              />
              <View style={styles.favoriteInfo}>
                <Text style={styles.favoriteName} numberOfLines={1}>{restaurant.name}</Text>
                {restaurant.address && (
                  <Text style={styles.favoriteAddress} numberOfLines={1}>{restaurant.address}</Text>
                )}
                {restaurant.rating && (
                  <Text style={styles.favoriteRating}>⭐ {restaurant.rating}</Text>
                )}
              </View>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.removeButton}
              onPress={() => handleRemoveFromPlaylist(restaurant.place_id, playlistId)}
            >
              <Ionicons name="remove-circle-outline" size={24} color="#fff" />
            </TouchableOpacity>
          </View>
        ))}
      </View>
    );
  }, [playlistItems, loadingPlaylistItems, handleRemoveFromPlaylist]);

  // Add refreshPlaylistItems to the onRefresh function
  const onRefresh = useCallback(async () => {
    if (refreshing) return; // Prevent multiple refreshes
    
    setRefreshing(true);
    setDataLoaded(false); // Reset data loaded flag to force a refresh
    
    try {
      // Refresh favorites
      if (user) {
        const updatedFavorites = await user.getFavorites();
        setFavorites(updatedFavorites);
      }
      
      // Refresh playlists
      if (user) {
        const updatedPlaylists = await user.getPlaylists();
        setPlaylists(updatedPlaylists);
        
        // If a playlist is selected, refresh its items
        if (selectedPlaylist) {
          await refreshPlaylistItems();
        }
      }
    } catch (err) {
      console.error('Error refreshing data:', err);
      setError(err instanceof Error ? err.message : 'Failed to refresh data');
    } finally {
      setRefreshing(false);
      setDataLoaded(true);
    }
  }, [refreshing, user, selectedPlaylist, refreshPlaylistItems]);

  // Memoize the playlists rendering
  const renderPlaylists = useCallback(() => {
    if (loadingPlaylists) {
      return <Text style={styles.emptyText}>Loading playlists...</Text>;
    }

    if (!playlists || playlists.length === 0) {
      return <Text style={styles.emptyText}>No playlists yet</Text>;
    }

    return (
      <View style={styles.playlistsList}>
        {playlists.map((playlist) => (
          <View key={playlist.id} style={styles.playlistContainer}>
            <TouchableOpacity
              style={[
                styles.playlistItem,
                selectedPlaylist?.id === playlist.id && styles.selectedPlaylistItem
              ]}
              onPress={() => handleSelectPlaylist(playlist)}
            >
              <Text style={styles.playlistName}>{playlist.name}</Text>
              <TouchableOpacity
                style={styles.deleteButton}
                onPress={() => handleDeletePlaylist(playlist.id)}
              >
                <Ionicons name="trash-outline" size={20} color="#fff" />
              </TouchableOpacity>
            </TouchableOpacity>
            
            {/* Render playlist items if this playlist is selected */}
            {selectedPlaylist?.id === playlist.id && renderPlaylistItems(playlist.id)}
          </View>
        ))}
      </View>
    );
  }, [playlists, loadingPlaylists, selectedPlaylist, handleSelectPlaylist, handleDeletePlaylist, renderPlaylistItems]);

  const handleCreatePlaylist = async () => {
    if (!user || !newPlaylistName.trim()) return;

    try {
      setError(null);
      const response = await fetch(`${API_URL}/playlists`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${user.token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ name: newPlaylistName.trim() })
      });

      if (!response.ok) {
        throw new Error('Failed to create playlist');
      }

      const data = await response.json();
      setPlaylists([...playlists, { id: data.playlist_id, name: newPlaylistName.trim() }]);
      setNewPlaylistName('');
      setShowCreatePlaylist(false);
    } catch (err) {
      console.error('Error creating playlist:', err);
      setError(err instanceof Error ? err.message : 'Failed to create playlist');
    }
  };

  const handleAddToPlaylist = useCallback(async (restaurant: Restaurant, playlistId: number) => {
    if (!user) return;
    
    try {
      setError(null);
      await user.addToPlaylist(playlistId, restaurant);
      
      // Refresh playlist items if the playlist is selected
      if (selectedPlaylist && selectedPlaylist.id === playlistId) {
        const updatedItems = await user.getPlaylistItems(playlistId);
        setPlaylistItems(updatedItems);
      }
      
      setShowAddToPlaylist(false);
      setSelectedFavorite(null);
    } catch (err) {
      console.error('Error adding to playlist:', err);
      setError(err instanceof Error ? err.message : 'Failed to add to playlist');
    }
  }, [user, selectedPlaylist]);

  const handleAddManualFavorite = async () => {
    setError(null);
    
    try {
      if (!user) {
        setError('You must be logged in to add favorites');
        return;
      }
      
      if (!selectedPlaceId) {
        setError('Please search for a restaurant');
        return;
      }
      
      await user.addManualFavorite(selectedPlaceId as string);
      
      // Refresh favorites
      const updatedFavorites = await user.getFavorites();
      setFavorites(updatedFavorites);
      
      // Reset form and close modal
      setSearchQuery('');
      setSearchResults([]);
      setSelectedPlaceId(null);
      setShowAddManualFavorite(false);
    } catch (err) {
      console.error('Error adding manual favorite:', err);
      setError(err instanceof Error ? err.message : 'Failed to add favorite');
    }
  };
  
  const handleSearchRestaurants = async (query: string) => {
    if (!user) return;
    
    setIsSearching(true);
    setError(null);
    
    try {
      const results = await user.searchRestaurants(query);
      setSearchResults(results);
    } catch (err) {
      console.error('Error searching restaurants:', err);
      setError(err instanceof Error ? err.message : 'Failed to search restaurants');
    } finally {
      setIsSearching(false);
    }
  };
  
  const handleSelectRestaurant = (restaurant: any) => {
    setSelectedPlaceId(restaurant.place_id);
    setSearchQuery(restaurant.name);
    setSearchResults([]);
  };

  const handleSaveProfile = useCallback(async () => {
    try {
      setError('');
      await updateUserProfile({
        displayName,
        currentPassword: currentPassword || undefined,
        password: newPassword || undefined,
        profilePicture: selectedPicture,
      });
      setIsEditing(false);
      setCurrentPassword('');
      setNewPassword('');
    } catch (error) {
      console.error('Error updating profile:', error);
      setError(error instanceof Error ? error.message : 'Failed to update profile');
    }
  }, [displayName, currentPassword, newPassword, selectedPicture, updateUserProfile]);

  const handleLogout = useCallback(async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Error signing out:', error);
    }
  }, [signOut]);

  const handleSelectPicture = useCallback((pictureId: string) => {
    setSelectedPicture(pictureId);
    setShowProfilePictures(false);
  }, []);

  const getProfilePicture = useCallback(() => {
    const picture = PROFILE_PICTURES.find(p => p.id === selectedPicture);
    return picture ? picture.source : PROFILE_PICTURES[0].source;
  }, [selectedPicture]);

  const handleDeleteFavorite = useCallback(async (placeId: string) => {
    if (!user) return;
    
    try {
      setError(null);
      await user.removeFavorite(placeId);
      
      // Refresh favorites
      const updatedFavorites = await user.getFavorites();
      setFavorites(updatedFavorites);
    } catch (err) {
      console.error('Error deleting favorite:', err);
      setError(err instanceof Error ? err.message : 'Failed to delete favorite');
    }
  }, [user]);

  const openAddToPlaylistModal = useCallback((restaurant: Restaurant) => {
    setSelectedFavorite(restaurant);
    setShowAddToPlaylist(true);
  }, []);

  // Memoize the favorites rendering to prevent unnecessary re-renders
  const renderFavorites = useCallback(() => {
    if (loadingFavorites) {
      return <Text style={styles.emptyText}>Loading favorites...</Text>;
    }

    if (!favorites || favorites.length === 0) {
      return <Text style={styles.emptyText}>No favorites yet</Text>;
    }

    return (
      <View style={styles.favoritesList}>
        {favorites.map((restaurant) => {
          const placeId = restaurant.place_id || restaurant.id;
          const address = restaurant.address || restaurant.vicinity;
          
          // Use getPhotoUrl to properly format the image URL
          let imageSource;
          if (restaurant.picture) {
            // Check if it's already a full URL or just a photo reference
            if (restaurant.picture.startsWith('http')) {
              imageSource = { uri: restaurant.picture };
            } else {
              // It's a photo reference, use the getPhotoUrl function
              imageSource = { uri: getPhotoUrl(restaurant.picture) };
            }
          } else {
            // Fallback to default image
            imageSource = require('@/assets/images/food-fight-logo.png');
          }

          return (
            <View key={placeId} style={styles.favoriteItemContainer}>
              <TouchableOpacity
                style={styles.favoriteItem}
                onPress={() => {
                  const url = `https://www.google.com/maps/place/?q=place_id:${placeId}`;
                  Linking.openURL(url).catch((err) => {
                    console.error('❌ Error opening Maps:', err);
                    setError('Failed to open restaurant location');
                  });
                }}
              >
                <Image
                  source={imageSource}
                  style={styles.favoriteImage}
                  onError={(e) => console.error('❌ Error loading image:', e.nativeEvent.error)}
                />
                <View style={styles.favoriteInfo}>
                  <Text style={styles.favoriteName} numberOfLines={1}>{restaurant.name}</Text>
                  {address && (
                    <Text style={styles.favoriteAddress} numberOfLines={1}>{address}</Text>
                  )}
                  {restaurant.rating && (
                    <Text style={styles.favoriteRating}>⭐ {restaurant.rating}</Text>
                  )}
                </View>
              </TouchableOpacity>
              <View style={styles.favoriteActions}>
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={() => openAddToPlaylistModal(restaurant)}
                >
                  <Ionicons name="add-circle-outline" size={24} color="#fff" />
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={() => handleDeleteFavorite(placeId)}
                >
                  <Ionicons name="trash-outline" size={24} color="#fff" />
                </TouchableOpacity>
              </View>
            </View>
          );
        })}
      </View>
    );
  }, [favorites, loadingFavorites, handleDeleteFavorite, openAddToPlaylistModal]);

  // Memoize the profile picture to prevent unnecessary re-renders
  const profilePicture = useMemo(() => getProfilePicture(), [getProfilePicture]);

  // Determine which restaurants to display on the map:
  // If a playlist is selected, show its items; otherwise, show all favorites.
  const mapFavorites = selectedPlaylist ? playlistItems : favorites;

  return (
    <ScrollView 
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      <View style={styles.header}>
        <Image
          source={profilePicture}
          style={styles.profilePicture}
        />
        <Text style={styles.displayName}>{user?.displayName || 'User'}</Text>
        <TouchableOpacity
          style={styles.editButton}
          onPress={() => setIsEditing(true)}
        >
          <Ionicons name="pencil" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Favorites</Text>
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => setShowAddManualFavorite(true)}
          >
            <Ionicons name="add-circle-outline" size={24} color="#fff" />
          </TouchableOpacity>
        </View>
        {renderFavorites()}
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Playlists</Text>
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => setShowCreatePlaylist(true)}
          >
            <Ionicons name="add-circle-outline" size={24} color="#fff" />
          </TouchableOpacity>
        </View>
        {renderPlaylists()}
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Map</Text>
          {playlists && playlists.length > 0 && (
            <TouchableOpacity
              style={styles.filterButton}
              onPress={() => setShowPlaylistDropdown(true)}
            >
              <Text style={styles.filterButtonText}>
                {selectedPlaylist ? selectedPlaylist.name : 'All Favorites'}
              </Text>
              <Ionicons name="filter" size={16} color="#fff" style={styles.filterIcon} />
            </TouchableOpacity>
          )}
        </View>
        
        <GoogleMapView items={mapFavorites} />
      </View>

      {/* Playlist Filter Modal */}
      <Modal
        visible={showPlaylistDropdown}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowPlaylistDropdown(false)}
      >
        <TouchableOpacity 
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowPlaylistDropdown(false)}
        >
          <View style={styles.filterModalContainer}>
            <View style={styles.filterModalHeader}>
              <Text style={styles.filterModalTitle}>Filter Map</Text>
              <TouchableOpacity onPress={() => setShowPlaylistDropdown(false)}>
                <Ionicons name="close" size={24} color="#fff" />
              </TouchableOpacity>
            </View>
            
            <View style={styles.filterModalContent}>
              <TouchableOpacity
                style={[
                  styles.filterModalItem,
                  !selectedPlaylist && styles.activeFilterModalItem
                ]}
                onPress={() => {
                  setSelectedPlaylist(null);
                  setShowPlaylistDropdown(false);
                }}
              >
                <Text style={styles.filterModalItemText}>All Favorites</Text>
                {!selectedPlaylist && (
                  <Ionicons name="checkmark" size={20} color="#fff" />
                )}
              </TouchableOpacity>
              
              {playlists.map((playlist) => (
                <TouchableOpacity
                  key={playlist.id}
                  style={[
                    styles.filterModalItem,
                    selectedPlaylist?.id === playlist.id && styles.activeFilterModalItem
                  ]}
                  onPress={() => {
                    handleSelectPlaylist(playlist);
                    setShowPlaylistDropdown(false);
                  }}
                >
                  <Text style={styles.filterModalItemText}>{playlist.name}</Text>
                  {selectedPlaylist?.id === playlist.id && (
                    <Ionicons name="checkmark" size={20} color="#fff" />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </TouchableOpacity>
      </Modal>

      <TouchableOpacity
        style={[styles.button, styles.logoutButton]}
        onPress={handleLogout}
      >
        <Text style={[styles.buttonText, styles.logoutText]}>Logout</Text>
      </TouchableOpacity>

      <Modal
        visible={isEditing}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setIsEditing(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit Profile</Text>
              <TouchableOpacity onPress={() => setIsEditing(false)}>
                <Ionicons name="close" size={24} color="#fff" />
              </TouchableOpacity>
            </View>

            <TouchableOpacity 
              style={styles.profilePictureButton}
              onPress={() => setShowProfilePictures(true)}
            >
              <Image source={profilePicture} style={styles.modalProfilePicture} />
              <Text style={styles.changePictureText}>Change Profile Picture</Text>
            </TouchableOpacity>

            <View style={styles.form}>
              <TextInput
                style={styles.input}
                placeholder="Display Name"
                value={displayName}
                onChangeText={setDisplayName}
                placeholderTextColor="#999"
              />
              <TextInput
                style={[styles.input, styles.disabledInput]}
                placeholder="Username"
                value={username}
                editable={false}
                placeholderTextColor="#999"
              />
              <TextInput
                style={styles.input}
                placeholder="Current Password"
                secureTextEntry
                value={currentPassword}
                onChangeText={setCurrentPassword}
                placeholderTextColor="#999"
              />
              <TextInput
                style={styles.input}
                placeholder="New Password"
                secureTextEntry
                value={newPassword}
                onChangeText={setNewPassword}
                placeholderTextColor="#999"
              />
              {error ? <Text style={styles.errorText}>{error}</Text> : null}
              <View style={styles.buttonRow}>
                <TouchableOpacity
                  style={[styles.button, styles.cancelButton]}
                  onPress={() => setIsEditing(false)}
                >
                  <Text style={styles.buttonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.button, styles.saveButton]}
                  onPress={handleSaveProfile}
                >
                  <Text style={styles.buttonText}>Save</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={showProfilePictures}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowProfilePictures(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Choose Profile Picture</Text>
              <TouchableOpacity onPress={() => setShowProfilePictures(false)}>
                <Ionicons name="close" size={24} color="#fff" />
              </TouchableOpacity>
            </View>
            <View style={styles.pictureGrid}>
              {PROFILE_PICTURES.map((picture) => (
                <TouchableOpacity
                  key={picture.id}
                  style={[
                    styles.pictureOption,
                    selectedPicture === picture.id && styles.selectedPicture
                  ]}
                  onPress={() => handleSelectPicture(picture.id)}
                >
                  <Image source={picture.source} style={styles.pictureThumbnail} />
                  <Text style={styles.pictureName}>{picture.name}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={showCreatePlaylist}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowCreatePlaylist(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Create New Playlist</Text>
              <TouchableOpacity onPress={() => setShowCreatePlaylist(false)}>
                <Ionicons name="close" size={24} color="#fff" />
              </TouchableOpacity>
            </View>
            <View style={styles.form}>
              <TextInput
                style={styles.input}
                placeholder="Playlist Name"
                value={newPlaylistName}
                onChangeText={setNewPlaylistName}
                placeholderTextColor="#999"
              />
              {error ? <Text style={styles.errorText}>{error}</Text> : null}
              <View style={styles.buttonRow}>
                <TouchableOpacity
                  style={[styles.button, styles.cancelButton]}
                  onPress={() => setShowCreatePlaylist(false)}
                >
                  <Text style={styles.buttonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.button, styles.saveButton]}
                  onPress={handleCreatePlaylist}
                >
                  <Text style={styles.buttonText}>Create</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={showAddManualFavorite}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowAddManualFavorite(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Manual Favorite</Text>
              <TouchableOpacity onPress={() => setShowAddManualFavorite(false)}>
                <Ionicons name="close" size={24} color="#fff" />
              </TouchableOpacity>
            </View>
            <View style={styles.form}>
              <TextInput
                style={styles.input}
                placeholder="Search for a restaurant"
                value={searchQuery}
                onChangeText={(text) => {
                  setSearchQuery(text);
                  if (text.length > 2) {
                    handleSearchRestaurants(text);
                  } else {
                    setSearchResults([]);
                  }
                }}
                placeholderTextColor="#999"
              />
              
              {isSearching && (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="small" color="#fff" />
                  <Text style={styles.loadingText}>Searching...</Text>
                </View>
              )}
              
              {searchResults.length > 0 && (
                <ScrollView style={styles.searchResultsContainer}>
                  {searchResults.map((result) => (
                    <TouchableOpacity
                      key={result.place_id}
                      style={styles.searchResultItem}
                      onPress={() => handleSelectRestaurant(result)}
                    >
                      <Text style={styles.searchResultName}>{result.name}</Text>
                      <Text style={styles.searchResultAddress}>{result.address}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              )}
              
              {error ? <Text style={styles.errorText}>{error}</Text> : null}
              
              <View style={styles.buttonRow}>
                <TouchableOpacity
                  style={[styles.button, styles.cancelButton]}
                  onPress={() => setShowAddManualFavorite(false)}
                >
                  <Text style={styles.buttonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.button, styles.saveButton]}
                  onPress={handleAddManualFavorite}
                >
                  <Text style={styles.buttonText}>Add</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={showAddToPlaylist}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowAddToPlaylist(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add to Playlist</Text>
              <TouchableOpacity onPress={() => setShowAddToPlaylist(false)}>
                <Ionicons name="close" size={24} color="#fff" />
              </TouchableOpacity>
            </View>
            
            {selectedFavorite && (
              <View style={styles.selectedFavoriteContainer}>
                <Text style={styles.selectedFavoriteName}>{selectedFavorite.name}</Text>
              </View>
            )}
            
            <View style={styles.playlistsList}>
              {playlists.map((playlist) => (
                <TouchableOpacity
                  key={playlist.id}
                  style={styles.playlistOption}
                  onPress={() => selectedFavorite && handleAddToPlaylist(selectedFavorite, playlist.id)}
                >
                  <Text style={styles.playlistOptionName}>{playlist.name}</Text>
                  <Ionicons name="add-circle-outline" size={24} color="#fff" />
                </TouchableOpacity>
              ))}
            </View>
            
            {playlists.length === 0 && (
              <Text style={styles.emptyText}>No playlists available. Create one first!</Text>
            )}
            
            {error ? <Text style={styles.errorText}>{error}</Text> : null}
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  filterContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 12,
  },
  filterButton: {
    backgroundColor: '#444',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minWidth: 120,
  },
  filterButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
    marginRight: 8,
  },
  filterIcon: {
    marginLeft: 4,
  },
  activeFilterButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  container: {
    flex: 1,
    backgroundColor: '#d2aeed',
  },
  header: {
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#d2aeed',
    position: 'relative',
  },
  profilePicture: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  displayName: {
    fontSize: 24,
    fontFamily: 'SmileySans',
    marginTop: 10,
    color: '#fff',
  },
  editButton: {
    position: 'absolute',
    top: 20,
    right: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    padding: 8,
    borderRadius: 20,
  },
  section: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.2)',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: 'SmileySans',
    marginBottom: 15,
    color: '#fff',
  },
  addButton: {
    padding: 5,
  },
  button: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginVertical: 10,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  cancelButton: {
    flex: 1,
    marginRight: 5,
  },
  saveButton: {
    flex: 1,
    marginLeft: 5,
  },
  logoutButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    margin: 20,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontFamily: 'SmileySans',
  },
  logoutText: {
    color: '#fff',
  },
  emptyText: {
    color: '#888',
    fontSize: 16,
    textAlign: 'center',
    marginTop: 20,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: '#222',
    borderRadius: 10,
    padding: 20,
    width: '80%',
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  form: {
    gap: 10,
  },
  input: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#fff',
  },
  disabledInput: {
    opacity: 0.7,
  },
  errorText: {
    color: '#ff6b6b',
    fontSize: 14,
    marginTop: 5,
  },
  profilePictureButton: {
    alignItems: 'center',
    marginBottom: 20,
  },
  modalProfilePicture: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  changePictureText: {
    color: '#fff',
    fontSize: 16,
    marginTop: 10,
    fontFamily: 'SmileySans',
  },
  pictureGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-around',
    gap: 15,
  },
  pictureOption: {
    alignItems: 'center',
    padding: 10,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  selectedPicture: {
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  pictureThumbnail: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginBottom: 5,
  },
  pictureName: {
    color: '#fff',
    fontSize: 14,
    fontFamily: 'SmileySans',
  },
  favoritesList: {
    marginTop: 10,
  },
  favoriteItemContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    height: 100,
  },
  favoriteItem: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 10,
    overflow: 'hidden',
    flex: 1,
    height: 100,
  },
  favoriteImage: {
    width: 100,
    height: 100,
    borderRadius: 10,
  },
  favoriteInfo: {
    flex: 1,
    padding: 10,
    justifyContent: 'center',
  },
  favoriteName: {
    color: '#fff',
    fontSize: 16,
    fontFamily: 'SmileySans',
    marginBottom: 4,
  },
  favoriteAddress: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 14,
    marginBottom: 4,
  },
  favoriteRating: {
    color: '#fff',
    fontSize: 14,
  },
  favoriteActions: {
    flexDirection: 'row',
    marginLeft: 10,
  },
  actionButton: {
    padding: 5,
    marginLeft: 5,
  },
  selectedFavoriteContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    padding: 10,
    borderRadius: 8,
    marginBottom: 15,
  },
  selectedFavoriteName: {
    color: '#fff',
    fontSize: 16,
    fontFamily: 'SmileySans',
  },
  playlistsList: {
    marginTop: 10,
  },
  playlistContainer: {
    marginBottom: 15,
  },
  playlistItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 10,
    padding: 15,
  },
  selectedPlaylistItem: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  playlistName: {
    color: '#fff',
    fontSize: 16,
    fontFamily: 'SmileySans',
  },
  deleteButton: {
    padding: 5,
  },
  playlistItemsList: {
    marginTop: 10,
  },
  removeButton: {
    padding: 10,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 10,
  },
  loadingText: {
    color: '#fff',
    marginLeft: 10,
    fontSize: 14,
  },
  searchResultsContainer: {
    maxHeight: 200,
    marginBottom: 15,
    marginTop: 10,
  },
  searchResultItem: {
    padding: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 8,
    marginBottom: 8,
  },
  searchResultName: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  searchResultAddress: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 14,
    marginTop: 4,
  },
  orText: {
    color: '#fff',
    textAlign: 'center',
    marginVertical: 10,
    fontSize: 14,
  },
  playlistOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
  },
  playlistOptionName: {
    color: '#fff',
    fontSize: 16,
    fontFamily: 'SmileySans',
  },
  mapContainer: {
    marginTop: 20,
    padding: 20,
  },
  mapTitle: {
    color: '#fff',
    fontSize: 18,
    fontFamily: 'SmileySans',
    marginBottom: 15,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterModalContainer: {
    backgroundColor: '#333',
    borderRadius: 10,
    width: '80%',
    maxHeight: '80%',
    overflow: 'hidden',
  },
  filterModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  filterModalTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  filterModalContent: {
    padding: 10,
  },
  filterModalItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    borderRadius: 8,
    marginBottom: 8,
  },
  activeFilterModalItem: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  filterModalItemText: {
    color: '#fff',
    fontSize: 16,
  },
}); 