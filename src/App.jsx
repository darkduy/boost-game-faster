import React, { useEffect, useState, useCallback, memo } from 'react';
import { View, Text, ActivityIndicator, Alert, NativeModules, NativeEventEmitter, TouchableOpacity, Linking, Appearance } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { useTailwind } from 'tailwind-rn';
import NetInfo from '@react-native-community/netinfo';
import AsyncStorage from '@react-native-async-storage/async-storage';
import GameList from './components/GameList';
import SystemStatus from './components/SystemStatus';
import NetworkOptimizer from './components/NetworkOptimizer';
import OnboardingScreen from './screens/OnboardingScreen';
import { GraphicsSettingsUtils } from './utils/GraphicsSettingsUtils';
import { DeviceMonitor } from './utils/DeviceMonitor';

// Native modules
const { GameDetector, BackgroundProcess, SystemSettings, BoostMode } = NativeModules;

// Memoized component to prevent unnecessary re-renders
const App = memo(() => {
  const tailwind = useTailwind();
  const [games, setGames] = useState([]);
  const [systemStatus, setSystemStatus] = useState({
    cpuUsage: 0,
    ramUsage: 0,
    fps: 0,
    ping: 0,
    temperature: DeviceMonitor.getSimulatedTemperature(),
  });
  const [isOnboardingComplete, setIsOnboardingComplete] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [networkState, setNetworkState] = useState({ isConnected: false, type: '' });
  const [vpnServer, setVpnServer] = useState('Auto');
  const [manufacturer, setManufacturer] = useState('');
  const [boostModeEnabled, setBoostModeEnabled] = useState(false);
  const [graphicsSettings, setGraphicsSettings] = useState(GraphicsSettingsUtils.getDefaultSettings());
  const [isDarkMode, setIsDarkMode] = useState(Appearance.getColorScheme() === 'dark');

  // Initialize app: load onboarding, device info, cached games, and system settings
  useEffect(() => {
    const initializeApp = async () => {
      try {
        // Check onboarding status
        const onboardingStatus = await AsyncStorage.getItem('onboardingComplete');
        if (onboardingStatus === 'true') {
          setIsOnboardingComplete(true);
        }

        // Load cached games
        const cachedGames = await AsyncStorage.getItem('cachedGames');
        if (cachedGames) {
          setGames(JSON.parse(cachedGames));
        }

        // Load device info
        const deviceInfo = await NativeModules.DeviceInfo.getDeviceInfo();
        setManufacturer(deviceInfo.manufacturer || 'unknown');

        // Load games asynchronously
        GameDetector.getInstalledGames((error, detectedGames) => {
          if (error) {
            Alert.alert('Error', `Failed to detect games: ${error}`);
            return;
          }
          setGames(detectedGames || []);
          AsyncStorage.setItem('cachedGames', JSON.stringify(detectedGames || []));
        });

        // Enable high performance mode
        SystemSettings.enableHighPerformanceMode((error) => {
          if (error && error.includes('PERMISSION_DENIED')) {
            Alert.alert(
              'Permission Required',
              'Please allow access to system settings for high performance mode.',
              [{ text: 'OK', onPress: () => Linking.openSettings() }]
            );
          }
        });

        // Listen for system status updates
        const eventEmitter = new NativeEventEmitter(GameDetector);
        eventEmitter.addListener('GameStatusUpdate', (status) => {
          setSystemStatus((prev) => {
            const newStatus = {
              cpuUsage: status.cpuUsage || prev.cpuUsage,
              ramUsage: status.ramUsage || prev.ramUsage,
              fps: status.fps || prev.fps,
              ping: status.ping || prev.ping,
              temperature: DeviceMonitor.getSimulatedTemperature(),
            };
            DeviceMonitor.checkPerformance(newStatus, Alert);
            AsyncStorage.setItem('systemStatus', JSON.stringify(newStatus));
            return newStatus;
          });
        });

        // Monitor network state
        const unsubscribeNet = NetInfo.addEventListener((state) => {
          setNetworkState({
            isConnected: state.isConnected,
            type: state.type,
          });
        });

        // Monitor dark mode changes
        const appearanceSubscription = Appearance.addChangeListener(({ colorScheme }) => {
          setIsDarkMode(colorScheme === 'dark');
        });

        setTimeout(() => setIsLoading(false), 1000);
        return () => {
          unsubscribeNet();
          appearanceSubscription.remove();
        };
      } catch (e) {
        Alert.alert('Error', `Failed to initialize app: ${e.message}`);
        setIsLoading(false);
      }
    };

    initializeApp();
  }, []);

  // Optimize game performance
  const optimizeGame = useCallback((game) => {
    BackgroundProcess.closeBackgroundApps(manufacturer, (error, closedApps) => {
      if (error) {
        GraphicsSettingsUtils.handlePermissionError(error, Linking, Alert);
        return;
      }
      Alert.alert('Success', `Optimized ${game.name}. Closed ${closedApps.length} background apps.`);
    });
  }, [manufacturer]);

  // Toggle BoostMode
  const toggleBoostMode = useCallback(() => {
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
  }, [boostModeEnabled, graphicsSettings]);

  // Update graphics settings
  const updateGraphicsSetting = useCallback((key, value) => {
    setGraphicsSettings((prev) => GraphicsSettingsUtils.validateSettings({ ...prev, [key]: value }));
  }, []);

  // Auto-suggest graphics settings based on device capability
  const suggestGraphicsSettings = useCallback(() => {
    const suggestedSettings = {
      resolution: systemStatus.ramUsage > 70 ? 'low' : 'medium',
      texture: systemStatus.ramUsage > 70 ? 'low' : 'medium',
      effects: systemStatus.cpuUsage > 70 ? 'off' : 'low',
      fpsLimit: systemStatus.temperature > 40 ? '30' : '60',
    };
    setGraphicsSettings(GraphicsSettingsUtils.validateSettings(suggestedSettings));
    Alert.alert('Suggested Settings', 'Graphics settings updated based on device performance.');
  }, [systemStatus]);

  // Render loading screen
  if (isLoading) {
    return (
      <View style={tailwind(`flex-1 justify-center items-center ${isDarkMode ? 'bg-gray-900' : 'bg-white'}`)}>
        <ActivityIndicator size="large" color={isDarkMode ? '#ffffff' : '#000000'} />
        <Text style={tailwind(`text-lg mt-4 ${isDarkMode ? 'text-white' : 'text-black'}`)}>Loading...</Text>
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
    <View style={tailwind(`flex-1 p-4 ${isDarkMode ? 'bg-gray-900' : 'bg-white'}`)}>
      <Text style={tailwind(`text-3xl font-bold mb-6 ${isDarkMode ? 'text-white' : 'text-black'}`)}>
        Boost Game Faster
      </Text>
      <TouchableOpacity
        style={tailwind(`p-3 rounded-lg ${boostModeEnabled ? 'bg-red-500' : 'bg-green-500'}`)}
        onPress={toggleBoostMode}
      >
        <Text style={tailwind('text-white text-center font-bold')}>
          {boostModeEnabled ? 'Disable BoostMode' : 'Enable BoostMode'}
        </Text>
      </TouchableOpacity>
      {boostModeEnabled && (
        <View style={tailwind(`bg-gray-800 p-4 rounded-lg mt-4 ${isDarkMode ? 'bg-gray-800' : 'bg-gray-200'}`)}>
          <Text style={tailwind(`text-lg mb-2 ${isDarkMode ? 'text-white' : 'text-black'}`)}>Graphics Settings</Text>
          <TouchableOpacity
            style={tailwind('bg-blue-500 p-2 rounded-lg mb-2')}
            onPress={suggestGraphicsSettings}
          >
            <Text style={tailwind('text-white text-center')}>Suggest Optimal Settings</Text>
          </TouchableOpacity>
          <View style={tailwind('mb-2')}>
            <Text style={tailwind(`text-white ${isDarkMode ? 'text-white' : 'text-black'}`)}>Resolution</Text>
            <Picker
              selectedValue={graphicsSettings.resolution}
              style={tailwind(`bg-gray-700 rounded ${isDarkMode ? 'text-white' : 'text-black'}`)}
              onValueChange={(value) => updateGraphicsSetting('resolution', value)}
            >
              <Picker.Item label="Default" value="default" />
              <Picker.Item label="Low (480p)" value="low" />
              <Picker.Item label="Medium (720p)" value="medium" />
            </Picker>
          </View>
          <View style={tailwind('mb-2')}>
            <Text style={tailwind(`text-white ${isDarkMode ? 'text-white' : 'text-black'}`)}>Texture Quality</Text>
            <Picker
              selectedValue={graphicsSettings.texture}
              style={tailwind(`bg-gray-700 rounded ${isDarkMode ? 'text-white' : 'text-black'}`)}
              onValueChange={(value) => updateGraphicsSetting('texture', value)}
            >
              <Picker.Item label="Low" value="low" />
              <Picker.Item label="Medium" value="medium" />
              <Picker.Item label="High" value="high" />
            </Picker>
          </View>
          <View style={tailwind('mb-2')}>
            <Text style={tailwind(`text-white ${isDarkMode ? 'text-white' : 'text-black'}`)}>Effects</Text>
            <Picker
              selectedValue={graphicsSettings.effects}
              style={tailwind(`bg-gray-700 rounded ${isDarkMode ? 'text-white' : 'text-black'}`)}
              onValueChange={(value) => updateGraphicsSetting('effects', value)}
            >
              <Picker.Item label="Off" value="off" />
              <Picker.Item label="Low" value="low" />
              <Picker.Item label="Medium" value="medium" />
            </Picker>
          </View>
          <View style={tailwind('mb-2')}>
            <Text style={tailwind(`text-white ${isDarkMode ? 'text-white' : 'text-black'}`)}>FPS Limit</Text>
            <Picker
              selectedValue={graphicsSettings.fpsLimit}
              style={tailwind(`bg-gray-700 rounded ${isDarkMode ? 'text-white' : 'text-black'}`)}
              onValueChange={(value) => updateGraphicsSetting('fpsLimit', value)}
            >
              <Picker.Item label="30 FPS" value="30" />
              <Picker.Item label="60 FPS" value="60" />
            </Picker>
          </View>
        </View>
      )}
      <SystemStatus systemStatus={systemStatus} isDarkMode={isDarkMode} />
      <NetworkOptimizer
        vpnServer={vpnServer}
        setVpnServer={setVpnServer}
        ping={systemStatus.ping}
        networkState={networkState}
        isDarkMode={isDarkMode}
      />
      <GameList
        games={games}
        optimizeGame={optimizeGame}
        graphicsSettings={graphicsSettings}
        isDarkMode={isDarkMode}
      />
    </View>
  );
});

export default App;
