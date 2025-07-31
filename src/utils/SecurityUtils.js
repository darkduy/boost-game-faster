import EncryptedStorage from 'react-native-encrypted-storage';
import { NativeModules, PermissionsAndroid } from 'react-native';

const { BoostMode } = NativeModules;

const SecurityUtils = {
  /**
   * Sanitizes input to prevent injection attacks
   * @param {string} input - Input string
   * @returns {string} Sanitized string
   */
  sanitizeInput: (input) => {
    if (typeof input !== 'string') return input;
    return input.replace(/[<>;{}]/g, '');
  },

  /**
   * Stores data securely using EncryptedStorage
   * @param {string} key - Storage key
   * @param {any} data - Data to store
   * @returns {Promise<void>}
   */
  storeSecureData: async (key, data) => {
    try {
      const sanitizedKey = SecurityUtils.sanitizeInput(key);
      await EncryptedStorage.setItem(sanitizedKey, JSON.stringify(data));
    } catch (e) {
      throw new Error(`Failed to store secure data: ${e.message}`);
    }
  },

  /**
   * Retrieves data securely from EncryptedStorage
   * @param {string} key - Storage key
   * @returns {Promise<any>} Retrieved data
   */
  getSecureData: async (key) => {
    try {
      const sanitizedKey = SecurityUtils.sanitizeInput(key);
      const data = await EncryptedStorage.getItem(sanitizedKey);
      return data ? JSON.parse(data) : null;
    } catch (e) {
      throw new Error(`Failed to retrieve secure data: ${e.message}`);
    }
  },

  /**
   * Checks if device is rooted
   * @returns {Promise<boolean>} True if rooted, false otherwise
   */
  checkRootStatus: async () => {
    return new Promise((resolve, reject) => {
      BoostMode.checkRootStatus((error, isRooted) => {
        if (error) {
          reject(new Error(error));
        } else {
          resolve(isRooted);
        }
      });
    });
  },

  /**
   * Checks location permission for Wi-Fi scanning
   * @returns {Promise<boolean>} True if granted, false otherwise
   */
  checkLocationPermission: async () => {
    try {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        {
          title: 'Location Permission',
          message: 'Boost Game Faster needs location access to scan Wi-Fi networks for optimization.',
          buttonNeutral: 'Ask Me Later',
          buttonNegative: 'Cancel',
          buttonPositive: 'OK',
        }
      );
      return granted === PermissionsAndroid.RESULTS.GRANTED;
    } catch (e) {
      throw new Error(`Failed to check location permission: ${e.message}`);
    }
  },
};

export { SecurityUtils };
