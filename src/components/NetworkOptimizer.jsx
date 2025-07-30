import React, { memo, useCallback } from 'react';
import { View, Text, TouchableOpacity, Alert } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { useTailwind } from 'tailwind-rn';
import { SecurityUtils } from '../utils/SecurityUtils';

// Memoized component to prevent unnecessary re-renders
const NetworkOptimizer = memo(({ vpnServer, setVpnServer, ping, networkState, isDarkMode }) => {
  const tailwind = useTailwind();

  // Simulate VPN connection (Android 9 lacks native VPN API)
  const connectToVpn = useCallback(() => {
    Alert.alert('VPN Connection', `Connected to ${SecurityUtils.sanitizeInput(vpnServer)} server.`);
  }, [vpnServer]);

  return (
    <View style={tailwind(`bg-gray-800 p-4 rounded-lg mb-4 ${isDarkMode ? 'bg-gray-800' : 'bg-gray-200'}`)}>
      <Text style={tailwind(`text-lg mb-2 ${isDarkMode ? 'text-white' : 'text-black'}`)}>Network Optimizer</Text>
      <Text style={tailwind(`text-sm mb-2 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`)}>
        Network: {networkState.isConnected ? SecurityUtils.sanitizeInput(networkState.type) : 'Disconnected'}
        {ping > 0 && ` | Ping: ${ping}ms`}
      </Text>
      <View style={tailwind('mb-2')}>
        <Text style={tailwind(`text-white ${isDarkMode ? 'text-white' : 'text-black'}`)}>VPN Server</Text>
        <Picker
          selectedValue={vpnServer}
          style={tailwind(`bg-gray-700 rounded ${isDarkMode ? 'text-white' : 'text-black'}`)}
          onValueChange={(value) => setVpnServer(SecurityUtils.sanitizeInput(value))}
        >
          <Picker.Item label="Auto" value="Auto" />
          <Picker.Item label="Singapore" value="Singapore" />
          <Picker.Item label="USA" value="USA" />
          <Picker.Item label="Japan" value="Japan" />
        </Picker>
      </View>
      <TouchableOpacity
        style={tailwind('bg-green-500 p-2 rounded-lg')}
        onPress={connectToVpn}
      >
        <Text style={tailwind('text-white text-center font-bold')}>Connect VPN</Text>
      </TouchableOpacity>
    </View>
  );
});

export default NetworkOptimizer;
