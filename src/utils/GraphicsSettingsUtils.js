import { Linking } from 'react-native';

// Utility for graphics settings validation and permission handling
export const GraphicsSettingsUtils = {
  // Default graphics settings
  getDefaultSettings: () => ({
    resolution: 'default',
    texture: 'medium',
    effects: 'medium',
    fpsLimit: '60',
  }),

  // Validate graphics settings
  validateSettings: (settings) => {
    const validResolutions = ['default', 'low', 'medium'];
    const validTextures = ['low', 'medium', 'high'];
    const validEffects = ['off', 'low', 'medium'];
    const validFpsLimits = ['30', '60'];

    return {
      resolution: validResolutions.includes(settings.resolution) ? settings.resolution : 'default',
      texture: validTextures.includes(settings.texture) ? settings.texture : 'medium',
      effects: validEffects.includes(settings.effects) ? settings.effects : 'medium',
      fpsLimit: validFpsLimits.includes(settings.fpsLimit) ? settings.fpsLimit : '60',
    };
  },

  // Handle permission errors with detailed messages
  handlePermissionError: (error, Linking, Alert) => {
    let message = 'Unknown error';
    let action = () => {};

    if (error.includes('Overlay permission')) {
      message = 'Overlay permission is required to display FPS/ping. Please enable it in Settings.';
      action = () => Linking.openSettings();
    } else if (error.includes('Usage stats permission')) {
      message = 'Usage stats permission is required to optimize performance. Please enable it in Settings.';
      action = () => Linking.openURL('android.settings.USAGE_ACCESS_SETTINGS');
    } else if (error.includes('Write settings permission')) {
      message = 'Write settings permission is required to adjust brightness. Please enable it in Settings.';
      action = () => Linking.openURL('android.settings.action.MANAGE_WRITE_SETTINGS');
    } else if (error.includes('Notification policy permission')) {
      message = 'Notification policy permission is required for Do Not Disturb mode. Please enable it in Settings.';
      action = () => Linking.openURL('android.settings.NOTIFICATION_POLICY_ACCESS_SETTINGS');
    } else if (error.includes('Rooted device')) {
      message = 'Rooted devices are not supported for security reasons.';
    }

    Alert.alert('Permission Error', message, [
      { text: 'OK', onPress: action },
      { text: 'Cancel', style: 'cancel' },
    ]);
  },
};
