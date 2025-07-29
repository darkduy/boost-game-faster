import React from 'react';
import { View, Text } from 'react-native';
import { useTailwind } from 'tailwind-rn';

const SystemStatus = ({ systemStatus }) => {
  const tailwind = useTailwind();

  return (
    <View style={tailwind('bg-gray-800 p-6 rounded-lg mb-8')}>
      <Text style={tailwind('text-2xl font-semibold text-white mb-4')}>
        System Status
      </Text>
      <Text style={tailwind('text-white mb-2')}>
        CPU Usage: {systemStatus.cpuUsage}%
      </Text>
      <Text style={tailwind('text-white mb-2')}>
        RAM Usage: {systemStatus.ramUsage}%
      </Text>
      <Text style={tailwind('text-white mb-2')}>
        FPS: {systemStatus.fps}
      </Text>
      <Text style={tailwind('text-white')}>
        Ping: {systemStatus.ping} ms
      </Text>
    </View>
  );
};

export default SystemStatus;
