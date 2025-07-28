import React from 'react';
import { View, Text, Picker } from 'react-native';
import { useTailwind } from 'tailwind-rn';

const NetworkOptimizer = ({ vpnServer, setVpnServer, ping, networkState }) => {
  const tailwind = useTailwind();

  return (
    <View style={tailwind('bg-gray-800 p-6 rounded-lg mb-8')}>
      <Text style={tailwind('text-2xl font-semibold text-white mb-4')}>
        Network Optimization
      </Text>
      <Text style={tailwind('text-white mb-2')}>
        Network Status: {networkState.isConnected ? networkState.type : 'Disconnected'}
      </Text>
      <Text style={tailwind('text-white mb-2')}>
        Select VPN Server:
      </Text>
      <Picker
        selectedValue={vpnServer}
        onValueChange={value => setVpnServer(value)}
        style={tailwind('bg-gray-700 text-white p-2 rounded')}
        accessibilityLabel="Select VPN server for network optimization"
      >
        <Picker.Item label="Auto" value="Auto" />
        <Picker.Item label="Singapore" value="Singapore" />
        <Picker.Item label="USA" value="USA" />
        <Picker.Item label="Japan" value="Japan" />
      </Picker>
      <Text style={tailwind('text-white mt-2')}>
        Current Ping: <Text style={tailwind('font-bold')}>{ping} ms</Text>
      </Text>
    </View>
  );
};

export default NetworkOptimizer;
