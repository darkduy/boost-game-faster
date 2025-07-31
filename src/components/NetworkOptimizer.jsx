import React, { useState, useEffect, useCallback, memo } from 'react';
import { View, Text, TouchableOpacity, FlatList, ActivityIndicator, Alert, Linking } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { useTailwind } from 'tailwind-rn';
import { SecurityUtils } from '../utils/SecurityUtils';
import { NativeModules } from 'react-native';

const { BoostMode } = NativeModules;

const NetworkOptimizer = memo(({ vpnServer, setVpnServer, ping, networkState, isDarkMode }) => {
  const tailwind = useTailwind();
  const [wifiNetworks, setWifiNetworks] = useState([]);
  const [isScanning, setIsScanning] = useState(false);
  const [selectedWifi, setSelectedWifi] = useState(null);
  const [recommendation, setRecommendation] = useState('');

  // Check location permission and scan Wi-Fi networks
  const scanWifiNetworks = useCallback(async () => {
    try {
      const hasPermission = await SecurityUtils.checkLocationPermission();
      if (!hasPermission) {
        Alert.alert('Permission Required', 'Please grant location permission to scan Wi-Fi networks.', [
          { text: 'OK', onPress: () => Linking.openSettings() },
        ]);
        return;
      }
      setIsScanning(true);
      BoostMode.scanWifiNetworks((error, networks) => {
        setIsScanning(false);
        if (error) {
          Alert.alert('Error', `Failed to scan Wi-Fi networks: ${error}`);
          return;
        }
        const sanitizedNetworks = networks.map(network => ({
          ssid: SecurityUtils.sanitizeInput(network.ssid),
          signalStrength: network.signalStrength,
          frequency: network.frequency,
          channel: network.channel,
          isOptimalChannel: network.isOptimalChannel,
        }));
        setWifiNetworks(sanitizedNetworks);

        // Generate recommendation
        const optimalNetwork = sanitizedNetworks.find(n => n.isOptimalChannel && n.signalStrength > -70);
        if (optimalNetwork) {
          setRecommendation(`Connect to ${optimalNetwork.ssid} (2.4GHz, Channel ${optimalNetwork.channel}) for best performance.`);
        } else {
          setRecommendation('Move closer to the router or place it in a central, open location. Use channel 1, 6, or 11.');
        }
      });
    } catch (e) {
      setIsScanning(false);
      Alert.alert('Error', `Failed to scan Wi-Fi: ${e.message}`);
    }
  }, []);

  // Open system Wi-Fi settings for manual connection
  const openWifiSettings = useCallback(() => {
    if (!selectedWifi) {
      Alert.alert('Error', 'Please select a Wi-Fi network.');
      return;
    }
    Linking.openSettings();
    Alert.alert('Instructions', `Select ${SecurityUtils.sanitizeInput(selectedWifi)} in Wi-Fi settings to connect.`);
  }, [selectedWifi]);

  // Render Wi-Fi network item
  const renderWifiItem = useCallback(
    ({ item }) => (
      <TouchableOpacity
        style={tailwind(`bg-gray-800 p-4 mb-2 rounded-lg ${isDarkMode ? 'bg-gray-800' : 'bg-gray-200'}`)}
        onPress={() => setSelectedWifi(item.ssid)}
      >
        <Text style={tailwind(`text-lg ${isDarkMode ? 'text-white' : 'text-black'}`)}>
          {item.ssid} ({item.signalStrength}dBm, 2.4GHz, Channel {item.channel})
          {item.isOptimalChannel ? ' (Optimal)' : ''}
        </Text>
      </TouchableOpacity>
    ),
    [isDarkMode]
  );

  // Optimize FlatList item layout
  const getItemLayout = (data, index) => ({
    length: 60,
    offset: 60 * index,
    index,
  });

  return (
    <View style={tailwind(`bg-gray-800 p-4 rounded-lg mb-4 ${isDarkMode ? 'bg-gray-800' : 'bg-gray-200'}`)}>
      <Text style={tailwind(`text-lg mb-2 ${isDarkMode ? 'text-white' : 'text-black'}`)}>Network Optimizer</Text>
      <Text style={tailwind(`text-sm mb-2 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`)}>
        Status: {networkState.isConnected ? `Connected (${networkState.type})` : 'Disconnected'} | Ping: {ping}ms
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
          <Picker.Item label="Japan" value="Japan" />
          <Picker.Item label="USA" value="USA" />
        </Picker>
      </View>
      <TouchableOpacity
        style={tailwind(`bg-blue-500 p-2 rounded-lg mb-2`)}
        onPress={scanWifiNetworks}
        disabled={isScanning}
      >
        <Text style={tailwind('text-white text-center font-bold')}>
          {isScanning ? 'Scanning Wi-Fi...' : 'Scan Wi-Fi Networks'}
        </Text>
      </TouchableOpacity>
      {recommendation ? (
        <Text style={tailwind(`text-sm mb-2 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`)}>
          Recommendation: {recommendation}
        </Text>
      ) : null}
      {wifiNetworks.length > 0 && (
        <>
          <Text style={tailwind(`text-lg mb-2 ${isDarkMode ? 'text-white' : 'text-black'}`)}>Available Wi-Fi Networks</Text>
          <FlatList
            data={wifiNetworks}
            renderItem={renderWifiItem}
            keyExtractor={(item) => item.ssid}
            initialNumToRender={5}
            maxToRenderPerBatch={5}
            windowSize={3}
            getItemLayout={getItemLayout}
          />
          <TouchableOpacity
            style={tailwind(`bg-green-500 p-2 rounded-lg mt-2`)}
            onPress={openWifiSettings}
            disabled={!selectedWifi}
          >
            <Text style={tailwind('text-white text-center font-bold')}>Open Wi-Fi Settings</Text>
          </TouchableOpacity>
        </>
      )}
    </View>
  );
});

export default NetworkOptimizer;
