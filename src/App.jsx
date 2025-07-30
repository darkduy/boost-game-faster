import React, { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator, Alert, NativeModules, NativeEventEmitter, TouchableOpacity, Linking } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { useTailwind } from 'tailwind-rn';
import NetInfo from '@react-native-community/netinfo';
import AsyncStorage from '@react-native-async-storage/async-storage';
import GameList from './components/GameList';
import SystemStatus from './components/SystemStatus';
import NetworkOptimizer from './components/NetworkOptimizer';
import OnboardingScreen from './screens/OnboardingScreen';
import { GraphicsSettingsUtils } from './utils/GraphicsSettingsUtils';

// Native modules
const { GameDetector, BackgroundProcess, SystemSettings, BoostMode } = NativeModules;

const App = () => {
  const tailwind = useTailwind();
  const [games, setGames] = useState([]);
  const [systemStatus, setSystemStatus] = useState({
    cpuUsage: 0,
    ramUsage: 0,
    fps: 0,
    ping: 0,
  });
  const [isOnboardingComplete, setIsOnboardingComplete] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [networkState, setNetworkState] = useState({ isConnected: false, type: '' });
  const [vpnServer, setVpnServer] = useState('Auto');
  const [manufacturer, setManufacturer] = useState('');
  const [boostModeEnabled, setBoostModeEnabled] = useState(false);
  const [graphicsSettings, setGraphicsSettings] = useState(GraphicsSettingsUtils.getDefaultSettings());

  // Initialize app: load onboarding, device info, games, and system settings
  useEffect(() => {
    const initializeApp = async () => {
      try {
        const onboardingStatus = await AsyncStorage.getItem('onboardingComplete');
        if (onboardingStatus === 'true') {
          setIsOnboardingComplete(true);
        }

        const deviceInfo = await NativeModules.DeviceInfo.getDeviceInfo();
        setManufacturer(deviceInfo.manufacturer || 'unknown');

        GameDetector.getInstalledGames((error, detectedGames) => {
          if (error) {
            Alert.alert('Error', `Failed to detect games: ${error}`);
            return;
          }
          setGames(detectedGames || []);
        });

        SystemSettings.enableHighPerformanceMode((error) => {
          if (error && error.includes('PERMISSION_DENIED')) {
            Alert.alert(
              'Permission Required',
              'Please allow access to system settings for high performance mode.',
              [{ text: 'OK', onPress: () => Linking.openSettings() }]
            );
          }
        });

        const eventEmitter = new NativeEventEmitter(GameDetector);
        eventEmitter.addListener('GameStatusUpdate', (status) => {
          setSystemStatus({
            cpuUsage: status.cpuUsage || 0,
            ramUsage: status.ramUsage || 0,
            fps: status.fps || 0,
            ping: status.ping || 0,
          });
        });

        const unsubscribe = NetInfo.addEventListener((state) => {
          setNetworkState({
            isConnected: state.isConnected,
            type: state.type,
          });
        });

        setTimeout(() => setIsLoading(false), 2000);
        return () => unsubscribe();
      } catch (e) {
        Alert.alert('Error', `Failed to initialize app: ${e.message}`);
        setIsLoading(false);
      }
    };

    initializeApp();
  }, []);

  // Optimize game performance
  const optimizeGame = (game) => {
    BackgroundProcess.closeBackgroundApps(manufacturer, (error, closedApps) => {
      if (error) {
        GraphicsSettingsUtils.handlePermissionError(error, Linking, Alert);
        return;
      }
      Alert.alert('Success', `Optimized ${game.name}. Closed ${closedApps.length} background apps.`);
    });
  };

  // Toggle BoostMode
  const toggleBoostMode = () => {
    if (boostModeEnabled) {
      BoostMode.disableBoostMode((error) => {
        if (error) {
          GraphicsSettingsUtils.handlePermissionError(error, Linking, Alert);
          return;
        }
        setBoostModeEnabled(false);
        Alert.alert('Success', 'BoostMode disabled.');
      });
    } else {
      const validatedSettings = GraphicsSettingsUtils.validateSettings(graphicsSettings);
      BoostMode.enableBoostMode(validatedSettings, (error) => {
        if (error) {
          GraphicsSettingsUtils.handlePermissionError(error, Linking, Alert);
          return;
        }
        setBoostModeEnabled(true);
        Alert.alert('Success', 'BoostMode enabled with custom graphics settings. Swipe from left to view FPS/ping overlay.');
      });
    }
  };

  // Update graphics settings
  const updateGraphicsSetting = (key, value) => {
    setGraphicsSettings((prev) => GraphicsSettingsUtils.validateSettings({ ...prev, [key]: value }));
  };

  // Render loading screen
  if (isLoading) {
    return (
      <View style={tailwind('flex-1 justify-center items-center bg-gray-900')}>
        <ActivityIndicator size="large" color="#ffffff" />
        <Text style={tailwind('text-white text-lg mt-4')}>Loading...</Text>
      </View>
    );
  }

  // Render onboarding screen
  if (!isOnboardingComplete) {
    return (
      <OnboardingScreen
        onComplete={() => {
          AsyncStorage.setItem('onboardingComplete', 'true');
          setIsOnboardingComplete(true);
        }}
      />
    );
  }

  // Render main UI
  return (
    <View style={tailwind('flex-1 bg-gray-900 p-4')}>
      <Text style={tailwind('text-3xl font-bold text-white mb-6')}>Boost Game Faster</Text>
      <TouchableOpacity
        style={tailwind(`p-3 rounded-lg ${boostModeEnabled ? 'bg-red-500' : 'bg-green-500'}`)}
        onPress={toggleBoostMode}
      >
        <Text style={tailwind('text-white text-center font-bold')}>
          {boostModeEnabled ? 'Disable BoostMode' : 'Enable BoostMode'}
        </Text>
      </TouchableOpacity>
      {boostModeEnabled && (
        <View style={tailwind('bg-gray-800 p-4 rounded-lg mt-4')}>
          <Text style={tailwind('text-white text-lg mb-2')}>Graphics Settings</Text>
          <View style={tailwind('mb-2')}>
            <Text style={tailwind('text-white')}>Resolution</Text>
            <Picker
              selectedValue={graphicsSettings.resolution}
              style={tailwind('text-white bg-gray-700 rounded')}
              onValueChange={(value) => updateGraphicsSetting('resolution', value)}
            >
              <Picker.Item label="Default" value="default" />
              <Picker.Item label="Low (480p)" value="low" />
              <Picker.Item label="Medium (720p)" value="medium" />
            </Picker>
          </View>
          <View style={tailwind('mb-2')}>
            <Text style={tailwind('text-white')}>Texture Quality</Text>
            <Picker
              selectedValue={graphicsSettings.texture}
              style={tailwind('text-white bg-gray-700 rounded')}
              onValueChange={(value) => updateGraphicsSetting('texture', value)}
            >
              <Picker.Item label="Low" value="low" />
              <Picker.Item label="Medium" value="medium" />
              <Picker.Item label="High" value="high" />
            </Picker>
          </View>
          <View style={tailwind('mb-2')}>
            <Text style={tailwind('text-white')}>Effects</Text>
            <Picker
              selectedValue={graphicsSettings.effects}
              style={tailwind('text-white bg-gray-700 rounded')}
              onValueChange={(value) => updateGraphicsSetting('effects', value)}
            >
              <Picker.Item label="Off" value="off" />
              <Picker.Item label="Low" value="low" />
              <Picker.Item label="Medium" value="medium" />
            </Picker>
          </View>
          <View style={tailwind('mb-2')}>
            <Text style={tailwind('text-white')}>FPS Limit</Text>
            <Picker
              selectedValue={graphicsSettings.fpsLimit}
              style={tailwind('text-white bg-gray-700 rounded')}
              onValueChange={(value) => updateGraphicsSetting('fpsLimit', value)}
            >
              <Picker.Item label="30 FPS" value="30" />
              <Picker.Item label="60 FPS" value="60" />
            </Picker>
          </View>
        </View>
      )}
      <SystemStatus systemStatus={systemStatus} />
      <NetworkOptimizer
        vpnServer={vpnServer}
        setVpnServer={setVpnServer}
        ping={systemStatus.ping}
        networkState={networkState}
      />
      <GameList games={games} optimizeGame={optimizeGame} graphicsSettings={graphicsSettings} />
    </View>
  );
};

export default App;
