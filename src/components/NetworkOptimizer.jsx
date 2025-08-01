import React, { useState, useEffect, useCallback, memo } from 'react';
import { View, Text, TouchableOpacity, FlatList, ActivityIndicator, Alert, Linking } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { useTailwind } from 'tailwind-rn';
import { SecurityUtils } from '../utils/SecurityUtils';
import { NativeModules } from 'react-native';

const { BoostMode, BackgroundProcess } = NativeModules;

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
    const [profiles, setProfiles] = useState(['Default', 'High Performance', 'Battery Saver', 'Extreme Boost']);
    const [targetPing, setTargetPing] = useState(75);

    // Scan Wi-Fi networks
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

    // Monitor performance
    useEffect(() => {
        let mounted = true;
        const monitor = async () => {
            while (mounted) {
                BoostMode.checkPerformance((error, data) => {
                    if (error || !mounted) return;
                    const { cpuUsage, ramUsage, ping, warning } = data;
                    setPerformanceWarning(warning);
                    setTargetPing(ping);
                });
                await new Promise(resolve => setTimeout(resolve, 60000)); // Check every 60s
            }
        };
        monitor();
        return () => { mounted = false; };
    }, []);

    // Apply BoostMode profile
    const applyBoostProfile = useCallback((profile) => {
        BoostMode.applyBoostProfile(profile, (error, message) => {
            if (error) {
                Alert.alert('Error', error);
            } else {
                setBoostProfile(profile);
                Alert.alert('Success', message);
                BackgroundProcess.closeBackgroundApps(profile, (error, message) => {
                    if (error) {
                        Alert.alert('Error', error);
                    }
                });
            }
        });
    }, []);

    // Open system Wi-Fi settings
    const openWifiSettings = useCallback(() => {
        if (!selectedWifi) {
            Alert.alert('Error', 'Please select a Wi-Fi network.');
            return;
        }
        Linking.openSettings();
        Alert.alert('Instructions', `Select ${SecurityUtils.sanitizeInput(selectedWifi)} in Wi-Fi settings to connect.`);
    }, [selectedWifi]);

    // Open router admin page
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

    // Toggle router guide
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
                    {item.isOptimalChannel ? ' (Optimal)' : ''}
                    {item.isRepeater ? ' (Repeater)' : ''}
                </Text>
            </TouchableOpacity>
        ),
        [isDarkMode]
    );

    return (
        <View style={tailwind('flex-1 p-4')}>
            <Text style={tailwind(`text-xl mb-4 ${isDarkMode ? 'text-white' : 'text-black'}`)}>
                Network Optimizer
            </Text>
            <Picker
                selectedValue={boostProfile}
                onValueChange={applyBoostProfile}
                style={tailwind(`mb-4 ${isDarkMode ? 'bg-gray-700 text-white' : 'bg-gray-200 text-black'}`)}
            >
                {profiles.map(profile => (
                    <Picker.Item key={profile} label={profile} value={profile} />
                ))}
            </Picker>
            <TouchableOpacity
                style={tailwind(`bg-blue-500 p-3 rounded-lg mb-4 ${isScanning ? 'opacity-50' : ''}`)}
                onPress={scanWifiNetworks}
                disabled={isScanning}
            >
                <Text style={tailwind('text-white text-center')}>Scan Wi-Fi Networks</Text>
            </TouchableOpacity>
            {isScanning && <ActivityIndicator size="large" color="#0000ff" />}
            {recommendation !== '' && (
                <Text style={tailwind(`mb-4 ${isDarkMode ? 'text-white' : 'text-black'}`)}>
                    Recommendation: {recommendation}
                </Text>
            )}
            {performanceWarning !== '' && (
                <Text style={tailwind('text-red-500 mb-4')}>
                    Warning: {performanceWarning}
                </Text>
            )}
            <FlatList
                data={wifiNetworks}
                renderItem={renderWifiItem}
                keyExtractor={item => item.ssid}
                initialNumToRender={5}
                windowSize={1}
                style={tailwind('mb-4')}
            />
            {selectedWifi && (
                <TouchableOpacity
                    style={tailwind('bg-green-500 p-3 rounded-lg mb-4')}
                    onPress={openWifiSettings}
                >
                    <Text style={tailwind('text-white text-center')}>
                        Connect to {selectedWifi}
                    </Text>
                </TouchableOpacity>
            )}
            <TouchableOpacity
                style={tailwind('bg-purple-500 p-3 rounded-lg mb-4')}
                onPress={toggleRouterGuide}
            >
                <Text style={tailwind('text-white text-center')}>
                    {showRouterGuide ? 'Hide' : 'Show'} Router Setup Guide
                </Text>
            </TouchableOpacity>
            {showRouterGuide && qosSettings && (
                <View style={tailwind('bg-gray-700 p-4 rounded-lg')}>
                    <Text style={tailwind('text-white')}>
                        Router QoS Setup:
                    </Text>
                    <Text style={tailwind('text-white')}>
                        - App: {qosSettings.appName}
                    </Text>
                    <Text style={tailwind('text-white')}>
                        - Bandwidth: {qosSettings.bandwidth}% of total
                    </Text>
                    <Text style={tailwind('text-white')}>
                        - Port: {qosSettings.port}
                    </Text>
                    <TouchableOpacity
                        style={tailwind('bg-blue-500 p-2 rounded-lg mt-2')}
                        onPress={openRouterSettings}
                    >
                        <Text style={tailwind('text-white text-center')}>
                            Open Router Settings
                        </Text>
                    </TouchableOpacity>
                </View>
            )}
        </View>
    );
});

export default NetworkOptimizer;
