import * as Location from "expo-location";
import AsyncStorage from "@react-native-async-storage/async-storage";

class User {
  constructor(name) {
    this.name = name;
    this.location = null; // Store last known location
  }

  async getLocation() {
    try {
      console.log("🔍 Checking stored permission status...");
      const storedPermission = await AsyncStorage.getItem("locationPermission");

      if (storedPermission === "granted") {
        console.log("✅ Permission already granted, skipping request...");
      } else {
        console.log("🔄 Requesting location permissions...");
        const { status } = await Location.requestForegroundPermissionsAsync();

        console.log(`📜 Permission status: ${status}`);
        if (status !== "granted") {
          console.warn("❌ Permission denied by user.");
          await AsyncStorage.setItem("locationPermission", "denied");
          return this.fallbackLocation();
        }

        await AsyncStorage.setItem("locationPermission", "granted");
      }

      console.log("📡 Getting current location...");
      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
        timeout: 7000, // Increased timeout
      });

      this.location = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      };

      console.log("✅ Location retrieved:", this.location);
      return this.location;
    } catch (error) {
      console.error("❌ Error getting user location:", error);

      if (error.code === 2 || error.message.includes("timeout")) {
        console.warn("⏳ Location timeout. Using fallback.");
        return this.fallbackLocation();
      }

      return null;
    }
  }

  fallbackLocation() {
    console.warn("🌍 Using fallback location: NYC");
    return { latitude: 40.7128, longitude: -74.006 }; // Default to NYC
  }
}

export default new User("Player1");
