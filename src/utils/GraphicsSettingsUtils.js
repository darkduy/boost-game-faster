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

  // Handle permission errors
  handlePermissionError: (error, Linking, Alert) => {
    if (error.includes('PERMISSION_DENIED')) {
      Alert.alert(
        'Permission Required',
        'Please allow overlay, notification, and settings permissions for BoostMode.',
        [{ text: 'OK', onPress: () => Linking.openSettings() }]
      );
    } else {
      Alert.alert('Error', `Failed to enable BoostMode: ${error}`);
    }
  },
};
