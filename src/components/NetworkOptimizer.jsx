import React from 'react';
import { View, Text, TouchableOpacity, Picker } from 'react-native';
import { useTailwind } from 'tailwind-rn';

const NetworkOptimizer = ({ vpnServer, setVpnServer, ping, networkState }) => {
  const tailwind = useTailwind();

  return (
    <View style={tailwind('bg-gray-800 p-6 rounded-lg mb-8')}>
      <Text style={tailwind('text-2xl font-semibold text-white mb-4')}>
        Network Optimizer
      </Text>
      <Text style={tailwind('text-white mb-2')}>
        Network Status: {networkState.isConnected ? networkState.type : 'Disconnected'}
      </Text>
      <Text style={tailwind('text-white mb-4')}>
        Current Ping: {ping} ms
      </Text>
      <Text style={tailwind('text-white mb-2')}>
        Select VPN Server:
      </Text>
      <Picker
        selectedValue={vpnServer}
        onValueChange={setVpnServer}
        style={tailwind('bg-gray-600 text-white p-1 rounded')}
        accessibilityLabel="Select VPN server"
      >
        <Picker.Item label="Auto" value="Auto" />
        <Picker.Item label="Singapore" value="Singapore" />
        <Picker.Item label="USA" value="USA" />
        <Picker.Item label="Japan" value="Japan" />
      </Picker>
    </View>
  );
};

export default NetworkOptimizer;
