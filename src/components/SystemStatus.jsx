import React from 'react';
import { View, Text } from 'react-native';
import { useTailwind } from 'tailwind-rn';

const SystemStatus = ({ systemStatus, isDarkMode }) => {
  const tailwind = useTailwind();

  return (
    <View style={tailwind(`bg-gray-800 p-4 rounded-lg my-4 ${isDarkMode ? 'bg-gray-800' : 'bg-gray-200'}`)}>
      <Text style={tailwind(`text-white text-lg mb-2 ${isDarkMode ? 'text-white' : 'text-black'}`)}>
        System Status
      </Text>
      <Text style={tailwind(`text-gray-400 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`)}>
        CPU Usage: {systemStatus.cpuUsage.toFixed(1)}%
      </Text>
      <Text style={tailwind(`text-gray-400 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`)}>
        RAM Usage: {systemStatus.ramUsage.toFixed(1)}%
      </Text>
      <Text style={tailwind(`text-gray-400 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`)}>
        FPS: {systemStatus.fps}
      </Text>
      <Text style={tailwind(`text-gray-400 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`)}>
        Ping: {systemStatus.ping} ms
      </Text>
      <Text style={tailwind(`text-gray-400 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`)}>
        Temperature: {systemStatus.temperature}°C
      </Text>
    </View>
  );
};

export default SystemStatus;
