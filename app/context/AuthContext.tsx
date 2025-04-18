import React, { createContext, useContext, useState, useEffect } from 'react';
import { useRouter, useSegments } from 'expo-router';
import User from '@/models/User';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Define the shape of our context
type AuthContextType = {
  isAuthenticated: boolean;
  user: User | null;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<void>;
  signup: (username: string, password: string, displayName: string) => Promise<void>;
  signOut: () => Promise<void>;
  updateUserProfile: (updates: { 
    displayName?: string; 
    password?: string; 
    currentPassword?: string;
    profilePicture?: string; 
  }) => Promise<void>;
};

// Create the context
const AuthContext = createContext<AuthContextType | null>(null);

// Custom hook to use the auth context
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

// Auth provider component
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const segments = useSegments();
  const router = useRouter();

  // Load saved user data on startup
  useEffect(() => {
    loadSavedUser();
  }, []);

  // Handle routing based on auth state
  useEffect(() => {
    if (isLoading) return;

    const inAuthGroup = segments[0] === '(auth)';
    const isAuthRoute = ['login', 'signup'].includes(segments[segments.length - 1] || '');

    if (!isAuthenticated && !isAuthRoute) {
      // Redirect to login if not authenticated and not on an auth route
      router.replace('/login');
    } else if (isAuthenticated && isAuthRoute) {
      // Redirect to home if authenticated and on an auth route
      router.replace('/');
    }
  }, [isAuthenticated, segments, isLoading]);

  const loadSavedUser = async () => {
    try {
      const savedUserData = await AsyncStorage.getItem('user');
      if (savedUserData) {
        const userData = JSON.parse(savedUserData);
        const user = User.fromJSON(userData);
        setUser(user);
        setIsAuthenticated(true);
      }
    } catch (error) {
      console.error('Error loading saved user:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePostAuth = async (newUser: User) => {
    try {
      // Request location permission after successful authentication
      await User.requestLocationPermission();
      // Update user's location
      const locationResult = await newUser.updateLocation();
      
      // Save user data
      await AsyncStorage.setItem('user', JSON.stringify(newUser.toJSON()));
      setUser(newUser);
      setIsAuthenticated(true);
      
      // If location is null, we'll handle it in the UI
      return locationResult;
    } catch (error) {
      console.error('Error in post-auth setup:', error);
      // Clear any partial auth state since location is required
      setUser(null);
      setIsAuthenticated(false);
      throw new Error('Location access is required to use this app. Please enable location services and try again.');
    }
  };

  const login = async (username: string, password: string) => {
    setIsLoading(true);
    try {
      const newUser = await User.login(username, password);
      await handlePostAuth(newUser);
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const signup = async (username: string, password: string, displayName: string) => {
    setIsLoading(true);
    try {
      const newUser = await User.signup(username, password, displayName);
      await handlePostAuth(newUser);
    } catch (error) {
      console.error('Signup error:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const updateUserProfile = async (updates: { 
    displayName?: string; 
    password?: string; 
    currentPassword?: string;
    profilePicture?: string; 
  }) => {
    if (!user) throw new Error('No user logged in');
    
    try {
      setIsLoading(true);
      const response = await user.updateProfile(updates);
      
      // Create a new User instance with the updated data
      const updatedUser = User.fromJSON({
        ...user.toJSON(),
        displayName: response.displayName || user.displayName,
        profilePicture: response.profilePicture || user.profilePicture,
      });
      
      await AsyncStorage.setItem('user', JSON.stringify(updatedUser.toJSON()));
      setUser(updatedUser);
    } catch (error) {
      console.error('Error updating profile:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const signOut = async () => {
    try {
      await AsyncStorage.removeItem('user');
      setUser(null);
      setIsAuthenticated(false);
      router.replace('/login');
    } catch (error) {
      console.error('Sign out error:', error);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        user,
        isLoading,
        login,
        signup,
        signOut,
        updateUserProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
} 