import AsyncStorage from "@react-native-async-storage/async-storage";

export const initializeTestMode = async () => {
  try {
    const isTestMode = await AsyncStorage.getItem('test_mode');
    if (isTestMode === null) {
      // Default to false if not set
      await AsyncStorage.setItem('test_mode', 'false');
    }
  } catch (error) {
    console.error('Error initializing test mode:', error);
  }
};

export const setTestMode = async (enabled) => {
  try {
    await AsyncStorage.setItem('test_mode', enabled.toString());
  } catch (error) {
    console.error('Error setting test mode:', error);
  }
};

export const isTestMode = async () => {
  try {
    const testMode = await AsyncStorage.getItem('test_mode');
    return testMode === 'true';
  } catch (error) {
    console.error('Error checking test mode:', error);
    return false;
  }
}; 