import { Stack } from "expo-router";
import { AuthProvider } from "@/context/AuthContext";
import { useFonts } from 'expo-font';
import { LoadingOverlay } from "@/components/LoadingOverlay";

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    'SmileySans': require('../assets/fonts/SmileySans-Oblique.ttf'),
  });

  if (!fontsLoaded) {
    return <LoadingOverlay message="Loading fonts..." />;
  }

  return (
    <AuthProvider>
      <Stack screenOptions={{ headerShown: false }} />
    </AuthProvider>
  );
}
