import { Tabs, Redirect } from "expo-router";
import { useAuth } from "@/context/AuthContext";
import { LoadingOverlay } from "@/components/LoadingOverlay";
import { Ionicons } from '@expo/vector-icons';

export default function AppLayout() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <LoadingOverlay message="Loading..." />;
  }

  if (!isAuthenticated) {
    return <Redirect href="/login" />;
  }

  return (
    <Tabs
      screenOptions={{
        headerStyle: {
          backgroundColor: '#d2aeed',
        },
        headerTintColor: '#284B63',
        headerTitleStyle: {
          fontFamily: 'SmileySans',
        },
        tabBarActiveTintColor: '#d2aeed',
        tabBarInactiveTintColor: '#ffffff',
        tabBarStyle: {
          backgroundColor: '#284B63',
          borderTopWidth: 0,
          elevation: 0,
          height: 60,
          paddingBottom: 8,
        },
        tabBarLabelStyle: {
          fontFamily: 'SmileySans',
          fontSize: 12,
          marginTop: 4,
        },
        tabBarItemStyle: {
          flex: 1,
          padding: 8,
          borderRadius: 0,
        },
        tabBarIconStyle: {
          marginBottom: 4,
        },
        tabBarActiveBackgroundColor: 'rgba(210, 174, 237, 0.2)',
        tabBarInactiveBackgroundColor: 'transparent',
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Restaurants',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="restaurant" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
} 