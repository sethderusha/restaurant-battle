import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Modal, Image, Linking, RefreshControl } from 'react-native';
import { useAuth } from '@/context/AuthContext';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Restaurant from '@/models/Restaurant';
  import { API_URL } from '@/config';
import { getPhotoUrl } from '@/api/api';

// Profile picture options - these will be replaced with actual images from assets
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

  // Load favorites when the screen is focused
  useFocusEffect(
    React.useCallback(() => {
      const loadFavorites = async () => {
        if (!user) {
          console.log('❌ Cannot load favorites: No user logged in');
          return;
        }

        try {
          console.log('🔄 Loading favorites for user:', user.id);
          setLoadingFavorites(true);
          setError(null);
          
          console.log('📡 Making API request to:', `${API_URL}/favorites`);
          const response = await fetch(`${API_URL}/favorites`, {
            headers: {
              'Authorization': `Bearer ${user.token}`,
              'Content-Type': 'application/json'
            }
          });

          console.log('📥 API Response status:', response.status);
          console.log('📥 API Response headers:', JSON.stringify(Object.fromEntries([...response.headers]), null, 2));

          if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            console.error('❌ Error response from server:', {
              status: response.status,
              statusText: response.statusText,
              error: errorData
            });
            throw new Error(errorData.error || 'Failed to load favorites');
          }

          const data = await response.json();
          console.log('✅ Raw API Response data:', JSON.stringify(data, null, 2));
          
          // The backend returns { favorites: Restaurant[] }
          const favoritesArray = data.favorites || [];
          console.log('📋 Processed favorites array:', JSON.stringify(favoritesArray, null, 2));
          setFavorites(favoritesArray);
        } catch (err) {
          console.error('❌ Error loading favorites:', err);
          setError(err instanceof Error ? err.message : 'Failed to load favorites');
          setFavorites([]);
        } finally {
          setLoadingFavorites(false);
        }
      };

      loadFavorites();
    }, [user])
  );

  const handleSaveProfile = async () => {
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
  };

  const handleLogout = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const handleSelectPicture = (pictureId: string) => {
    setSelectedPicture(pictureId);
    setShowProfilePictures(false);
  };

  const getProfilePicture = () => {
    const picture = PROFILE_PICTURES.find(p => p.id === selectedPicture);
    return picture ? picture.source : PROFILE_PICTURES[0].source;
  };

  const renderFavorites = () => {
    if (loadingFavorites) {
      return <Text style={styles.emptyText}>Loading favorites...</Text>;
    }

    if (!favorites || favorites.length === 0) {
      return <Text style={styles.emptyText}>No favorites yet</Text>;
    }

    console.log('🔄 Rendering favorites list:', favorites.length, 'items');

    return (
      <View style={styles.favoritesList}>
        {favorites.map((restaurant) => {
          console.log('📍 Processing restaurant:', {
            id: restaurant.id,
            place_id: restaurant.place_id,
            name: restaurant.name,
            address: restaurant.address,
            vicinity: restaurant.vicinity,
            picture: restaurant.picture
          });

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
            <TouchableOpacity
              key={placeId}
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
          );
        })}
      </View>
    );
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Image
          source={getProfilePicture()}
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
        <Text style={styles.sectionTitle}>Favorites</Text>
        {renderFavorites()}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Playlists</Text>
        <Text style={styles.emptyText}>No playlists yet</Text>
      </View>

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
              <Image source={getProfilePicture()} style={styles.modalProfilePicture} />
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
    </ScrollView>
  );
}

const styles = StyleSheet.create({
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
  sectionTitle: {
    fontSize: 18,
    fontFamily: 'SmileySans',
    marginBottom: 15,
    color: '#fff',
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
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 16,
    textAlign: 'center',
    marginTop: 10,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#d2aeed',
    borderRadius: 20,
    padding: 20,
    width: '90%',
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontFamily: 'SmileySans',
    color: '#fff',
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
  favoriteItem: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 10,
    marginBottom: 10,
    overflow: 'hidden',
  },
  favoriteImage: {
    width: 80,
    height: 80,
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
}); 