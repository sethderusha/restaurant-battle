import React, { createContext, useContext, useState, useEffect } from 'react';
import { useRouter, useSegments } from 'expo-router';
import User from '@/models/User';

// Define the shape of our context
type AuthContextType = {
  isAuthenticated: boolean;
  user: User | null;
  isLoading: boolean;
  login: (username: string) => Promise<void>;
  signup: (username: string, displayName: string) => Promise<void>;
  logout: () => void;
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
  const [isLoading, setIsLoading] = useState(false);
  const segments = useSegments();
  const router = useRouter();

  // Handle routing based on auth state
  useEffect(() => {
    const inAuthGroup = segments[0] === '(auth)';
    const isAuthRoute = ['login', 'signup'].includes(segments[segments.length - 1] || '');

    if (!isAuthenticated && !isAuthRoute) {
      // Redirect to login if not authenticated and not on an auth route
      router.replace('/login');
    } else if (isAuthenticated && isAuthRoute) {
      // Redirect to home if authenticated and on an auth route
      router.replace('/');
    }
  }, [isAuthenticated, segments]);

  const handlePostAuth = async (newUser: User) => {
    try {
      // Request location permission after successful authentication
      await User.requestLocationPermission();
      // Update user's location
      await newUser.updateLocation();
      setUser(newUser);
      setIsAuthenticated(true);
    } catch (error) {
      console.error('Error in post-auth setup:', error);
      // Clear any partial auth state since location is required
      setUser(null);
      setIsAuthenticated(false);
      throw new Error('Location access is required to use this app. Please enable location services and try again.');
    }
  };

  const login = async (username: string) => {
    setIsLoading(true);
    try {
      const newUser = new User({
        username,
        displayName: username,
        id: Date.now().toString(),
      });
      await handlePostAuth(newUser);
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const signup = async (username: string, displayName: string) => {
    setIsLoading(true);
    try {
      const newUser = new User({
        username,
        displayName,
        id: Date.now().toString(),
      });
      await handlePostAuth(newUser);
    } catch (error) {
      console.error('Signup error:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    setUser(null);
    setIsAuthenticated(false);
  };

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        user,
        isLoading,
        login,
        signup,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
} 