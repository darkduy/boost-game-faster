import React from 'react';
import { View, Text, TouchableOpacity, Linking } from 'react-native';
import { useTailwind } from 'tailwind-rn';
import { request, PERMISSIONS } from 'react-native-permissions';

const OnboardingScreen = ({ onComplete }) => {
  const tailwind = useTailwind();

  const grantPermissions = async () => {
    await request(PERMISSIONS.ANDROID.WRITE_SETTINGS);
    await request(PERMISSIONS.ANDROID.QUERY_ALL_PACKAGES);
    await Linking.openSettings();
    onComplete();
  };

  return (
    <View style={tailwind('flex-1 bg-gray-900 p-6 justify-center')}>
      <Text style={tailwind('text-3xl font-bold text-white mb-6 text-center')}>
        Welcome to Boost Game Faster
      </Text>
      <Text style={tailwind('text-white mb-4')}>
        Step 1: Grant permission to modify system settings for performance optimization.
      </Text>
      <Text style={tailwind('text-white mb-8')}>
        Step 2: Allow access to installed apps to detect games.
      </Text>
      <TouchableOpacity
        style={tailwind('bg-blue-600 p-4 rounded-lg mx-auto')}
        onPress={grantPermissions}
        accessible={true}
        accessibilityLabel="Grant permissions"
      >
        <Text style={tailwind('text-white font-bold text-lg')}>
          Grant Permissions
        </Text>
      </TouchableOpacity>
    </View>
  );
};

export default OnboardingScreen;
