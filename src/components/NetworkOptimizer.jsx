import React, { useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, Alert } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { useTailwind } from 'tailwind-rn';

// Simulate network speed test (Android 9 lacks direct API)
const simulateNetworkSpeedTest = () => {
  // Simulate download speed between 1-50 Mbps
  const downloadSpeed = Math.floor(Math.random() * (50 - 1 + 1)) + 1;
  return downloadSpeed;
};

const NetworkOptimizer = ({ vpnServer, setVpnServer, ping, networkState, isDarkMode }) => {
  const tailwind = useTailwind();
  const [networkSpeed, setNetworkSpeed] = useState(null);

  // Run network speed test
  const runNetworkSpeedTest = useCallback(() => {
    const speed = simulateNetworkSpeedTest();
    setNetworkSpeed(speed);
    Alert.alert('Network Speed Test', `Download Speed: ${speed} Mbps`);
    if (speed < 10) {
      Alert.alert('Recommendation', 'Consider switching to a faster VPN server.');
    }
  }, []);

  return (
    <View style={tailwind(`bg-gray-800 p-4 rounded-lg my-4 ${isDarkMode ? 'bg-gray-800' : 'bg-gray-200'}`)}>
      <Text style={tailwind(`text-white text-lg mb-2 ${isDarkMode ? 'text-white' : 'text-black'}`)}>
        Network Optimizer
      </Text>
      <Text style={tailwind(`text-gray-400 mb-2 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`)}>
        Connection: {networkState.isConnected ? networkState.type : 'Disconnected'}
      </Text>
      <Text style={tailwind(`text-gray-400 mb-2 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`)}>
        Ping: {ping} ms
      </Text>
      {networkSpeed && (
        <Text style={tailwind(`text-gray-400 mb-2 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`)}>
          Download Speed: {networkSpeed} Mbps
        </Text>
      )}
      <TouchableOpacity
        style={tailwind('bg-blue-500 p-2 rounded-lg mb-2')}
        onPress={runNetworkSpeedTest}
      >
        <Text style={tailwind('text-white text-center')}>Test Network Speed</Text>
      </TouchableOpacity>
      <View>
        <Text style={tailwind(`text-white ${isDarkMode ? 'text-white' : 'text-black'}`)}>VPN Server</Text>
        <Picker
          selectedValue={vpnServer}
          style={tailwind(`text-white bg-gray-700 rounded ${isDarkMode ? 'text-white' : 'text-black'}`)}
          onValueChange={(value) => setVpnServer(value)}
        >
          <Picker.Item label="Auto" value="Auto" />
          <Picker.Item label="Singapore" value="Singapore" />
          <Picker.Item label="USA" value="USA" />
          <Picker.Item label="Japan" value="Japan" />
        </Picker>
      </View>
    </View>
  );
};

export default NetworkOptimizer;
