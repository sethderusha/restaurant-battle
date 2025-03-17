import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Modal, Image } from 'react-native';
import { useAuth } from '@/context/AuthContext';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

// Profile picture options - these will be replaced with actual images from assets
const PROFILE_PICTURES = [
  { id: 'default', name: 'Default', source: require('@/assets/images/pfps/default.png') },
  { id: 'avatar1', name: 'Avatar 1', source: require('@/assets/images/pfps/avatar1.png') },
  { id: 'avatar2', name: 'Avatar 2', source: require('@/assets/images/pfps/avatar2.png') },
  { id: 'avatar3', name: 'Avatar 3', source: require('@/assets/images/pfps/avatar3.png') },
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
  const [error, setError] = useState('');

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
        <Text style={styles.emptyText}>No favorites yet</Text>
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
    textAlign: 'center',
    color: 'rgba(255, 255, 255, 0.7)',
    fontStyle: 'italic',
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
}); 