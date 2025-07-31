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
  const [channelData, setChannelData] = useState([]);
  const [showRouterGuide, setShowRouterGuide] = useState(false);
  const [qosSettings, setQosSettings] = useState(null);
  const [performanceWarning, setPerformanceWarning] = useState('');
  const [boostProfile, setBoostProfile] = useState('Default');
  const [profiles, setProfiles] = useState(['Default', 'High Performance', 'Battery Saver']);

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
      BoostMode.scanWifiNetworks((error, result) => {
        setIsScanning(false);
        if (error) {
          Alert.alert('Error', `Failed to scan Wi-Fi networks: ${error}`);
          return;
        }
        const { networks, channelInterference, repeaters, gameApp } = result;
        const sanitizedNetworks = networks.map(network => ({
          ssid: SecurityUtils.sanitizeInput(network.ssid),
          signalStrength: network.signalStrength,
          frequency: network.frequency,
          channel: network.channel,
          isOptimalChannel: network.isOptimalChannel,
          isRepeater: network.isRepeater || false,
        }));
        setWifiNetworks(sanitizedNetworks);
        setChannelData(channelInterference.map(item => ({
          channel: item.channel,
          interference: item.interference,
        })));

        // Generate recommendation
        const optimalNetwork = sanitizedNetworks.find(n => n.isOptimalChannel && n.signalStrength > -70);
        const repeaterNetwork = sanitizedNetworks.find(n => n.isRepeater && n.signalStrength > -70);
        if (repeaterNetwork) {
          setRecommendation(`Connect to repeater ${repeaterNetwork.ssid} (2.4GHz, Channel ${repeaterNetwork.channel}) for better signal.`);
        } else if (optimalNetwork) {
          setRecommendation(`Connect to ${optimalNetwork.ssid} (2.4GHz, Channel ${optimalNetwork.channel}) for best performance.`);
        } else {
          setRecommendation('Move closer to the router or use a Wi-Fi repeater. Set channel to 1, 6, or 11.');
        }

        // Generate QoS suggestion
        if (gameApp) {
          BoostMode.suggestQosSettings(gameApp, (error, settings) => {
            if (!error) {
              setQosSettings(settings);
            }
          });
        }
      });
    } catch (e) {
      setIsScanning(false);
      Alert.alert('Error', `Failed to scan Wi-Fi: ${e.message}`);
    }
  }, []);

  // Monitor performance and show warnings
  useEffect(() => {
    const interval = setInterval(() => {
      BoostMode.checkPerformance((error, data) => {
        if (error) return;
        const { cpuUsage, ramUsage, ping } = data;
        let warning = '';
        if (cpuUsage > 80) warning += 'High CPU usage detected. Close background apps.\n';
        if (ramUsage > 80) warning += 'Low memory available. Free up RAM.\n';
        if (ping > 100) warning += 'High ping detected. Switch to a better network.\n';
        setPerformanceWarning(warning);
      });
    }, 30000); // Check every 30s
    return () => clearInterval(interval);
  }, []);

  // Apply BoostMode profile
  const applyBoostProfile = useCallback((profile) => {
    BoostMode.applyBoostProfile(profile, (error, message) => {
      if (error) {
        Alert.alert('Error', error);
      } else {
        setBoostProfile(profile);
        Alert.alert('Success', message);
      }
    });
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

  // Open router admin page for QoS configuration
  const openRouterSettings = useCallback(() => {
    if (!qosSettings) {
      Alert.alert('Error', 'No QoS settings available. Please scan networks first.');
      return;
    }
    const routerUrl = 'http://192.168.0.1';
    Linking.openURL(routerUrl).catch(() => {
      Alert.alert('Error', 'Failed to open router settings. Try accessing 192.168.0.1 manually.');
    });
    Alert.alert(
      'QoS Configuration',
      `Log in to your router at ${routerUrl} and set:\n- Priority: High for ${qosSettings.appName}\n- Bandwidth: ${qosSettings.bandwidth}% of total\n- Port: ${qosSettings.port}\nRefer to your router manual for detailed steps.`
    );
  }, [qosSettings]);

  // Toggle router guide visibility
  const toggleRouterGuide = useCallback(() => {
    setShowRouterGuide(!showRouterGuide);
  }, [showRouterGuide]);

  // Render Wi-Fi network item
  const renderWifiItem = useCallback(
    ({ item }) => (
      <TouchableOpacity
        style={tailwind(`bg-gray-800 p-4 mb-2 rounded-lg ${isDarkMode ? 'bg-gray-800' : 'bg-gray-200'}`)}
        onPress={() => setSelectedWifi(item.ssid)}
      >
        <Text style={tailwind(`text-lg ${isDarkMode ? 'text-white' : 'text-black'}`)}>
          {item.ssid} ({item.signalStrength}dBm, 2.4GHz, Channel {item.channel})
          {item.isOptimalChannel ? ' (Optimal)' : ''}{item.isRepeater ? ' (Repeater)' : ''}
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
      {performanceWarning ? (
        <Text style={tailwind(`text-sm mb-2 text-red-500`)}>
          Warning: {performanceWarning}
        </Text>
      ) : null}
      <View style={tailwind('mb-2')}>
        <Text style={tailwind(`text-white ${isDarkMode ? 'text-white' : 'text-black'}`)}>BoostMode Profile</Text>
        <Picker
          selectedValue={boostProfile}
          style={tailwind(`bg-gray-700 rounded ${isDarkMode ? 'text-white' : 'text-black'}`)}
          onValueChange={(value) => applyBoostProfile(SecurityUtils.sanitizeInput(value))}
        >
          {profiles.map(profile => (
            <Picker.Item key={profile} label={profile} value={profile} />
          ))}
        </Picker>
      </View>
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
      {qosSettings && (
        <TouchableOpacity
          style={tailwind(`bg-orange-500 p-2 rounded-lg mb-2`)}
          onPress={openRouterSettings}
        >
          <Text style={tailwind('text-white text-center font-bold')}>
            Configure QoS for Gaming
          </Text>
        </TouchableOpacity>
      )}
      {recommendation ? (
        <Text style={tailwind(`text-sm mb-2 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`)}>
          Recommendation: {recommendation}
        </Text>
      ) : null}
      {channelData.length > 0 && (
        <>
          <Text style={tailwind(`text-lg mb-2 ${isDarkMode ? 'text-white' : 'text-black'}`)}>Wi-Fi Channel Interference</Text>
          ```chartjs
          {
            "type": "bar",
            "data": {
              "labels": ${JSON.stringify(channelData.map(item => `Channel ${item.channel}`))},
              "datasets": [{
                "label": "Interference (Networks)",
                "data": ${JSON.stringify(channelData.map(item => item.interference))},
                "backgroundColor": "${isDarkMode ? '#4B5EAA' : '#60A5FA'}",
                "borderColor": "${isDarkMode ? '#2C3E50' : '#2563EB'}",
                "borderWidth": 1
              }]
            },
            "options": {
              "scales": {
                "y": {
                  "beginAtZero": true,
                  "title": {
                    "display": true,
                    "text": "Number of Networks",
                    "color": "${isDarkMode ? '#FFFFFF' : '#000000'}"
                  }
                },
                "x": {
                  "title": {
                    "display": true,
                    "text": "Wi-Fi Channel",
                    "color": "${isDarkMode ? '#FFFFFF' : '#000000'}"
                  }
                }
              },
              "plugins": {
                "legend": {
                  "labels": {
                    "color": "${isDarkMode ? '#FFFFFF' : '#000000'}"
                  }
                }
              }
            }
          }
          ```
        </>
      )}
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
      <TouchableOpacity
        style={tailwind(`bg-purple-500 p-2 rounded-lg mt-2`)}
        onPress={toggleRouterGuide}
      >
        <Text style={tailwind('text-white text-center font-bold')}>
          {showRouterGuide ? 'Hide Router Guide' : 'Show Router Guide'}
        </Text>
      </TouchableOpacity>
      {showRouterGuide && (
        <View style={tailwind(`mt-2 p-4 rounded-lg ${isDarkMode ? 'bg-gray-700' : 'bg-gray-300'}`)}>
          <Text style={tailwind(`text-lg mb-2 ${isDarkMode ? 'text-white' : 'text-black'}`)}>Router Optimization Guide</Text>
          <Text style={tailwind(`text-sm mb-2 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`)}>
            1. Place router in a central, open location, away from walls and metal objects.
            2. Elevate router to 1-2 meters height for better signal spread.
            3. Access router settings (e.g., 192.168.0.1) and set channel to 1, 6, or 11 (see chart above).
            4. Enable QoS in router settings to prioritize gaming traffic.
          </Text>
        </View>
      )}
    </View>
  );
});

export default NetworkOptimizer;
