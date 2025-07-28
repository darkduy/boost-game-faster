import React from 'react';
import { View, Text } from 'react-native';
import { useTailwind } from 'tailwind-rn';

const SystemStatus = ({ systemStatus }) => {
  const tailwind = useTailwind();

  return (
    <View style={tailwind('mb-8')}>
      <View style={tailwind('flex-row flex-wrap')}>
        {[
          { label: 'CPU Usage', value: `${systemStatus.cpuUsage}%` },
          { label: 'RAM Usage', value: `${systemStatus.ramUsage}%` },
          { label: 'FPS', value: systemStatus.fps },
          { label: 'Ping', value: `${systemStatus.ping} ms` },
        ].map((item, index) => (
          <View key={index} style={tailwind('bg-gray-800 p-4 rounded-lg m-1 flex-1')}>
            <Text style={tailwind('text-xl font-semibold text-white')}>
              {item.label}
            </Text>
            <Text style={tailwind('text-2xl text-white')}>{item.value}</Text>
          </View>
        ))}
      </View>
    </View>
  );
};

export default SystemStatus;
