import EncryptedStorage from 'react-native-encrypted-storage';
import { NativeModules, Alert } from 'react-native';

const { BoostMode } = NativeModules;

// Secure storage wrapper
export const SecurityUtils = {
  // Store data securely
  async storeSecureData(key, value) {
    try {
      const sanitizedValue = JSON.stringify(value).replace(/[<>{}]/g, ''); // Prevent injection
      await EncryptedStorage.setItem(key, sanitizedValue);
    } catch (e) {
      Alert.alert('Error', `Failed to store data securely: ${e.message}`);
    }
  },

  // Retrieve secure data
  async getSecureData(key) {
    try {
      const value = await EncryptedStorage.getItem(key);
      if (value) {
        return JSON.parse(value);
      }
      return null;
    } catch (e) {
      Alert.alert('Error', `Failed to retrieve data: ${e.message}`);
      return null;
    }
  },

  // Check if device is rooted (via native module)
  async checkRootStatus() {
    try {
      return await BoostMode.checkRootStatus();
    } catch (e) {
      Alert.alert('Error', `Failed to check root status: ${e.message}`);
      return false;
    }
  },

  // Sanitize input to prevent injection
  sanitizeInput(input) {
    if (typeof input !== 'string') return input;
    return input.replace(/[<>{};]/g, '');
  },
};
